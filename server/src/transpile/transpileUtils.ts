import { env } from "../env"
import { joinAndCreate, writeFile } from "../fsUtils"
import fs from "node:fs/promises"
import { join } from "node:path"

async function baseTempDir() {
  return joinAndCreate(env.DATA_DIR, "temp", true)
}

export async function withTempDir<T>(fn: ((path: string) => Promise<T>)): Promise<Awaited<T>> {
  const tempPath = await fs.mkdtemp(join(await baseTempDir(), "temp-"))

  try {
    const result = await fn(tempPath)
    return result
  } finally {
    await fs.rm(tempPath, { recursive: true, force: true })
  }
}

export async function writeInputFile(path: string, content: string) {
  return await writeFile(await joinAndCreate(path, "input"), "code.kt", content)
}

export async function readOutputFile(path: string): Promise<string> {
  return await fs.readFile(join(path, "js", "transpiled.js"), { encoding: "utf-8" })
}