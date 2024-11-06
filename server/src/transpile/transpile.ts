import { spawnSync } from "bun"
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
    const processResult = syncTranspileKtJs(workdir, 15000, 512, withRunsc)

    if (processResult.status !== TranspilationStatus.Success)
      return { status: processResult.status, message: processResult.message }

    return {
      status: processResult.status,
      transpiled: await readOutputFile(workdir),
    }
  })
}

function syncTranspileKtJs(
  workdir: string,
  timeout: number,
  maxMemory: number,
  withRunsc: boolean
): { status: TranspilationStatus; message?: string } {
  const result = spawnSync(
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
    { stdout: "pipe", stderr: "pipe", timeout: timeout }
  )
  console.log("Ressource usage:", result.resourceUsage)

  if (result.success) return { status: TranspilationStatus.Success }

  if (result.signalCode === "SIGKILL")
    return { status: TranspilationStatus.Timeout }
  if (result.exitCode === 1) {
    console.error(result.stderr.toString())
    return {
      status: TranspilationStatus.CompilationError,
      message: trimErrorMessage(result.stderr.toString()),
    }
  }

  return {
    status: TranspilationStatus.UnknownError,
    message: result.stderr.toString(),
  }
}

function trimErrorMessage(error: string): string {
  const internalIndex = error.indexOf("info: produce executable: /data/js/")
  if (internalIndex === -1) return error
  return error.substring(0, internalIndex)
}
