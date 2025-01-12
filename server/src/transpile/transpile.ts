import { spawn } from "bun"
import { env } from "../env"
import { checkRunscEnvironment } from "./checkRunscEnv"
import { checkTranspilerImage } from "./checkTranspilerImage"
import { TranspilationStatus } from "./TranspilationStatus"
import { readOutputFile, readSourceMap, withTempDir, writeInputFile } from "./transpileUtils"

export type TranspilationResult = {
  status: TranspilationStatus
  transpiled?: string
  sourcemap?: string
  message?: string
}

const withRunsc = await checkRunscEnvironment()
await checkTranspilerImage()

export async function transpile(code: string, coroutineLib = true, sourcemap = false): Promise<TranspilationResult> {
  return withTempDir(
    async (relative, absolute) => {
      await writeInputFile(absolute, code)
      const processResult = await transpileKtJs(
        env.DATA_VOLUME_NAME,
        env.DATA_DIR,
        relative,
        env.TRANSPILER_TIMEOUT,
        coroutineLib,
        sourcemap,
        withRunsc,
        env.TRANSPILER_MEMORY,
        env.TRANSPILER_MEMORY_SWAP,
        env.TRANSPILER_CPU
      )

      if (processResult.status !== TranspilationStatus.Success)
        return { status: processResult.status, message: processResult.message }

      return {
        status: processResult.status,
        transpiled: await readOutputFile(absolute),
        sourcemap: sourcemap ? await readSourceMap(absolute) : undefined,
      }
    },
    {
      status: TranspilationStatus.UnknownError,
      message: "An internal error occurred.",
    }
  )
}

async function transpileKtJs(
  volumeName: string | undefined,
  dataDir: string | undefined,
  relativeWorkDir: string,
  timeout: number,
  withCoroutineLib: boolean,
  generateSourceMap: boolean,
  withRunsc: boolean,
  maxMemory: string,
  maxSwap: string | undefined,
  cpuLimit: number | undefined
): Promise<{ status: TranspilationStatus; message?: string }> {
  return new Promise(async resolve => {
    if (!volumeName && !dataDir) throw new Error("Either volumeName or dataDir must be provided")
    const process = spawn(
      [
        "docker",
        "run",
        volumeName
          ? `--mount=source=${volumeName},volume-subpath=${relativeWorkDir},target=/data,type=volume`
          : `-v=${dataDir}/${relativeWorkDir}:/data`,
        withRunsc ? "--runtime=runsc" : "",
        withCoroutineLib ? "--env=INCLUDE_COROUTINE_LIB=true" : "",
        generateSourceMap ? "--env=GENERATE_SOURCE_MAP=true" : "",
        maxMemory ? `--memory=${maxMemory}` : "",
        maxSwap ? `--memory-swap=${maxSwap}` : "",
        cpuLimit ? `--cpus=${cpuLimit}` : "",
        "--network=none",
        "--rm",
        `${env.TRANSPILER_NAME}:latest`,
      ].filter(Boolean),
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
