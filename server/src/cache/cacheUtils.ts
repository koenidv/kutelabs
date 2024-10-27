import { hash } from "bun"
import { env } from "../env"
import fs from "node:fs/promises"
import { join } from "node:path"
import { joinAndCreate, readFile, writeFile } from "../fsUtils"

async function baseCacheDir() {
  return joinAndCreate(env.DATA_DIR, "cache", true)
}

export async function writeTranspiledCache(input: string, output: string) {
  // todo calculate chance of collision - security relevant if not quasi-impossible
  const inputHash = hash(input).toString()
  await writeFile(await baseCacheDir(), inputHash, output)
}

export async function existsInCache(input: string) {
  const inputHash = hash(input).toString()
  return await fs.exists(join(await baseCacheDir(), inputHash))
}

export async function readTranspiledCache(input: string) {
  const inputHash = hash(input).toString()
  return await readFile(await baseCacheDir(), inputHash)
}

// todo delete cache files after some time