import { spawn } from "bun"
import { env } from "../env"
import { checkRunscEnvironment } from "./checkRunscEnv"
import { checkTranspilerImage } from "./checkTranspilerImage"
import { TranspilationStatus } from "./TranspilationStatus"
import { readOutputFile, withTempDir, writeInputFile } from "./transpileUtils"

export type TranspilationResult = {
  status: TranspilationStatus
  transpiled?: string
  message?: string
}

const withRunsc = await checkRunscEnvironment()
await checkTranspilerImage()

export async function transpile(code: string): Promise<TranspilationResult> {
  return withTempDir(
    async (relative, absolute) => {
      await writeInputFile(absolute, code)
      const processResult = await transpileKtJs(env.DATA_VOLUME_NAME, relative, 30000, 768, withRunsc)

      if (processResult.status !== TranspilationStatus.Success)
        return { status: processResult.status, message: processResult.message }

      return {
        status: processResult.status,
        transpiled: await readOutputFile(absolute),
      }
    },
    {
      status: TranspilationStatus.UnknownError,
      message: "An internal error occurred.",
    }
  )
}

async function transpileKtJs(
  volumeName: string,
  relativeWorkDir: string,
  timeout: number,
  maxMemory: number,
  withRunsc: boolean
): Promise<{ status: TranspilationStatus; message?: string }> {
  return new Promise(async resolve => {
    const process = spawn(
      [
        "docker",
        "run",
        `--mount=source=${volumeName},volume-subpath=${relativeWorkDir},target=/data,type=volume`,
        withRunsc ? "--runtime=runsc" : "",
        `--memory=${maxMemory}m`,
        "--cpus=1",
        "--network=none",
        "--rm",
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
      "completed with exit code",
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
          message:
            (await new Response(process.stderr).text()) +
            "\n" +
            (await new Response(process.stdout).text()),
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
