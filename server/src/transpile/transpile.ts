import { spawn } from "bun"
import { checkRunscEnvironment } from "./checkRunscEnv"
import { readOutputFile, withTempDir, writeInputFile } from "./transpileUtils"
import { checkTranspilerImage } from "./checkTranspilerImage"
import { env } from "../env"
import { TranspilationStatus } from "./TranspilationStatus"

export type TranspilationResult = {
  status: TranspilationStatus
  transpiled?: string
  message?: string
}

const withRunsc = await checkRunscEnvironment()
await checkTranspilerImage()

export async function transpile(code: string): Promise<TranspilationResult> {
  return withTempDir(async workdir => {
    await writeInputFile(workdir, code)
    const processResult = await transpileKtJs(workdir, 30000, 512, withRunsc)

    if (processResult.status !== TranspilationStatus.Success)
      return { status: processResult.status, message: processResult.message }

    return {
      status: processResult.status,
      transpiled: await readOutputFile(workdir),
    }
  })
}

async function transpileKtJs(
  workdir: string,
  timeout: number,
  maxMemory: number,
  withRunsc: boolean
): Promise<{ status: TranspilationStatus; message?: string }> {
  return new Promise(async resolve => {
    const process = spawn(
      [
        "docker",
        "run",
        withRunsc ? "--runtime=runsc" : "",
        "--rm",
        "-v",
        `${workdir}:/data`,
        `--memory=${maxMemory}m`,
        "--cpus=1",
        "--network=none",
        `${env.TRANSPILER_NAME}:latest`,
      ],
      { stdout: "pipe", stderr: "pipe" }
    )

    const killTimeout = setTimeout(() => {
      if (process.exitCode === null) {
        process.kill("SIGKILL")
        resolve({
          status: TranspilationStatus.Timeout,
          message: `Timeout after ${timeout}ms`,
        })
      }
    }, timeout)

    const exitCode = await process.exited
    clearTimeout(killTimeout)
    console.info(
      "Ressource usage:",
      process.resourceUsage(),
      "compledted with exit code",
      exitCode,
      process.signalCode
    )
    if (process.signalCode === "SIGKILL") {
      resolve({
        status: TranspilationStatus.Timeout,
      })
    }
    switch (exitCode) {
      case 0:
        resolve({ status: TranspilationStatus.Success })
        break
      case 1:
        resolve({
          status: TranspilationStatus.CompilationError,
          message: trimErrorMessage(await new Response(process.stderr).text()),
        })
        break
      default:
        resolve({
          status: TranspilationStatus.UnknownError,
          message: await new Response(process.stderr).text(),
        })
    }
  })
}

function trimErrorMessage(error: string): string {
  const internalIndex = error.indexOf("info: produce executable: /data/js/")
  if (internalIndex === -1) return error
  return error.substring(0, internalIndex)
}
