import { env } from "../env"
import { joinAndCreate, writeFile } from "../fsUtils"
import fs from "node:fs/promises"
import { join } from "node:path"

async function baseTempDir() {
  const joined = await joinAndCreate(env.DATA_DIR, "temp", true)
  return { base: env.DATA_DIR, relative: "temp", joined }
}

export async function withTempDir<T>(
  fn: (relative: string, absolute: string) => Promise<T>,
  errorReturn: T
): Promise<Awaited<T>> {
  const tempBase = await baseTempDir()
  const tempPath = await fs.mkdtemp(tempBase.joined + "/")
  const relativePath = tempPath.substring(tempBase.base.length + 1)

  try {
    const result = await fn(relativePath, tempPath)
    return result
  } catch (e) {
    console.error(e)
    return errorReturn as Awaited<T>
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

export function trimErrorMessage(error: string | undefined): string | undefined {
  if (!error) return error
  const internalIndex = error.indexOf("info: produce executable: /data/js/")
  if (internalIndex === -1) return error
  return error.substring(0, internalIndex)
}
