import { hash } from "bun"
import { env } from "../env"
import fs from "node:fs/promises"
import { join } from "node:path"
import { joinAndCreate, readFile, writeFile } from "../fsUtils"
import { ResultDTO } from "../routes/transpile/ResultDTO"
import { TranspilationStatus } from "../routes/transpile/Status"

async function baseCacheDir() {
  return joinAndCreate(env.DATA_DIR, "cache", true)
}

export function shouldCache(status: TranspilationStatus) {
  return (
    status === TranspilationStatus.Success ||
    status === TranspilationStatus.CompilationError
  )
}

/**
  * Write the transpiled code to cache
  * @param inputOptions this should include all relevant inputs that led to this output, i.e. code, sourcemap
  * @param output the transpiled code dto
  */
export async function writeTranspiledCache(inputOptions: string[], output: ResultDTO) {
  // chance of collision is very low: 2^64, ~4.3bn inputs needed for a 50% chance of collision
  try {
    await writeFile(
      await baseCacheDir(),
      hash(inputOptions.join()).toString(),
      output.setAsCached().toString()
    )
  } catch (e) {
    console.error(e)
  }
}

/**
  * Check if the input is already in cache
  * @param inputOptions includes all options that would be used to write the code to cache
  */
export async function existsInCache(inputOptions: string[]) {
  try {
    return await fs.exists(join(await baseCacheDir(), hash(inputOptions.join()).toString()))
  } catch (e) {
    console.error(e)
    return false
  }
}

/**
  * Read the transpiled code from cache
  * @param inputOptions includes all options that would be used to write the code to cache
  */
export async function readTranspiledCache(inputOptions: string[]): Promise<ResultDTO> {
  try {
    const cached = await readFile(await baseCacheDir(), hash(inputOptions.join()).toString())
    return ResultDTO.fromJSON(cached)
  } catch (e) {
    console.error(e)
    return ResultDTO.error(TranspilationStatus.CacheError)
  }
}

// todo delete cache files after some time
