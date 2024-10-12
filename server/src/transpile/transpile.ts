import { spawnSync } from "bun"
import { checkRunscEnvironment } from "./checkRunscEnv"
import { readOutputFile, withTempDir, writeInputFile } from "./transpileUtils"
import { checkTranspilerImage } from "./checkTranspilerImage"

export enum TranspilationStatus {
  Success,
  CompilationError,
  Timeout,
  UnknownError,
}
export type TranspilationResult = {
  status: TranspilationStatus
  transpiled?: string
}

const withRunsc = await checkRunscEnvironment()
await checkTranspilerImage()

export async function transpile(code: string): Promise<TranspilationResult> {
  return withTempDir(async workdir => {
    await writeInputFile(workdir, code)
    const status = syncTranspilation(workdir, 15000, 512, withRunsc)
    if (status !== TranspilationStatus.Success) return { status }
    return { status, transpiled: await readOutputFile(workdir) }
  })
}

function syncTranspilation(
  workdir: string,
  timeout: number,
  maxMemory: number,
  withRunsc: boolean
): TranspilationStatus {
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
      "transpiler:latest",
    ],
    { stdout: "pipe", stderr: "pipe", timeout: timeout }
  )
  console.log("Ressource usage:", result.resourceUsage)
  if (result.success) return TranspilationStatus.Success
  if (result.signalCode === "SIGKILL") return TranspilationStatus.Timeout
  if (result.exitCode === 1) return TranspilationStatus.CompilationError
  return TranspilationStatus.UnknownError
}
