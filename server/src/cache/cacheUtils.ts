import { hash } from "bun"
import { env } from "../env"
import fs from "node:fs/promises"
import { join } from "node:path"
import { joinAndCreate, readFile, writeFile } from "../fsUtils"
import { ResultDTO } from "../routes/transpile/ResultDTO"
import { TranspilationStatus } from "../transpile/TranspilationStatus"

async function baseCacheDir() {
  return joinAndCreate(env.DATA_DIR, "cache", true)
}

export function shouldCache(status: TranspilationStatus) {
  return (
    status === TranspilationStatus.Success ||
    status === TranspilationStatus.CompilationError
  )
}

export async function writeTranspiledCache(input: string, output: ResultDTO) {
  // todo calculate chance of collision - security relevant if not quasi-impossible
  try {
    await writeFile(
      await baseCacheDir(),
      hash(input).toString(),
      output.setAsCached().toString()
    )
  } catch (e) {
    console.error(e)
  }
}

export async function existsInCache(input: string) {
  try {
    return await fs.exists(join(await baseCacheDir(), hash(input).toString()))
  } catch (e) {
    console.error(e)
  }
}

export async function readTranspiledCache(input: string): Promise<ResultDTO> {
  try {
    const cached = await readFile(await baseCacheDir(), hash(input).toString())
    return ResultDTO.fromJSON(cached)
  } catch (e) {
    console.error(e)
    return ResultDTO.error(TranspilationStatus.CacheError)
  }
}

// todo delete cache files after some time
