import { env } from "../env"
import { joinAndCreate, writeFile } from "../fsUtils"
import fs from "node:fs/promises"
import { join } from "node:path"

export async function baseTempDir() {
  const joined = await joinAndCreate(env.DATA_DIR, "temp", true)
  return { base: env.DATA_DIR, relative: "temp", joined }
}

export async function withTempDir<T>(
  fn: (relative: string, absolute: string) => Promise<T>,
  errorReturn: T
): Promise<Awaited<T>> {
  let tempPath: string | null = null
  try {
    const tempBase = await baseTempDir()
    tempPath = await fs.mkdtemp(tempBase.joined + "/")
    const relativePath = tempPath.substring(tempBase.base.length + 1)

    const result = await fn(relativePath, tempPath)
    return result
  } catch (e) {
    console.error("Error within temp directory:", e)
    return errorReturn as Awaited<T>
  } finally {
    if (tempPath) await fs.rm(tempPath, { recursive: true, force: true })
  }
}

export async function writeInputFile(path: string, content: string) {
  if (content.length > 5 * 1024 * 1024) throw new Error("Input file too large")
  return await writeFile(await joinAndCreate(path, "input"), "code.kt", content)
}

export async function readOutputFile(path: string): Promise<string> {
  return await fs.readFile(join(path, "js", "transpiled.js"), { encoding: "utf-8" })
}

export async function readSourceMap(path: string): Promise<string | undefined> {
  try {
    return await fs.readFile(join(path, "js", "transpiled.js.map"), { encoding: "utf-8" })
  } catch (e) {
    return undefined
  }
}

export function trimErrorMessage(error: string | undefined): string | undefined {
  if (!error) return error
  const internalIndex = error.indexOf("info: produce executable: /data/js/")
  if (internalIndex === -1) return error.substring(0, error.indexOf("\n"))
  return error.substring(0, internalIndex)
}
