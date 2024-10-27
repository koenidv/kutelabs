import fs from "node:fs/promises"
import { join } from "node:path"

export async function joinAndCreate(
  path1: string,
  path2: string,
  recursive = false
): Promise<string> {
  const joined = join(path1, path2)
  await createDirectoryIfNotExists(joined, recursive)
  return joined
}

async function createDirectoryIfNotExists(path: string, recursive = false) {
  if (!(await fs.exists(path))) {
    await fs.mkdir(path, { recursive })
  }
}

export async function writeFile(
  path: string,
  fileName: string,
  content: string
): Promise<string> {
  await fs.writeFile(join(path, fileName), content, {
    encoding: "utf-8",
    flag: "w",
  })
  return join(path, fileName)
}

export async function readFile(
  path: string,
  fileName: string
): Promise<string> {
  return await fs.readFile(join(path, fileName), { encoding: "utf-8" })
}
