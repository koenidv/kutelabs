import { beforeEach, describe, expect, mock, test } from "bun:test"
import {
  readOutputFile,
  trimErrorMessage,
  withTempDir,
  writeInputFile,
} from "../../../src/transpile/transpileUtils"

const mockFs = {
  mkdtemp: mock((path: string) => Promise.resolve(`${path}test-dir`)),
  mkdir: mock((_path: string) => Promise.resolve()),
  writeFile: mock((_path: string, _content: string) => Promise.resolve()),
  readFile: mock((_path: string) => Promise.resolve("mocked content")),
  rm: mock((_path: string) => Promise.resolve()),
  access: mock((_path: string) => Promise.resolve()),
  exists: mock((_path: string) => Promise.resolve(false)),
}
mock.module("fs/promises", () => ({ ...mockFs, default: mockFs }))

describe("transpileUtils", () => {
  beforeEach(() => {
    mockFs.mkdtemp.mockClear()
    mockFs.mkdir.mockClear()
    mockFs.writeFile.mockClear()
    mockFs.readFile.mockClear()
    mockFs.rm.mockClear()
    mockFs.access.mockClear()
    mockFs.exists.mockClear()
  })

  describe("withTempDir", () => {
    test("cleanup after operation", async () => {
      let tempPath = ""
      await withTempDir(async (_, absolute) => {
        tempPath = absolute
      }, null)

      expect(mockFs.rm).toHaveBeenCalledWith(tempPath, { recursive: true, force: true })
    })

    test("reject very long paths", async () => {
      const longPath = "a".repeat(255) // often max length
      mockFs.mkdtemp.mockImplementationOnce(() => Promise.resolve(longPath))

      const result = await withTempDir(async (_, absolute) => {
        expect(absolute).toBe(longPath)
        return true
      }, false)

      expect(result).toBe(true)
      expect(mockFs.rm).toHaveBeenCalledWith(longPath, { recursive: true, force: true })
    })

    test("filesystem errors", async () => {
      mockFs.mkdtemp.mockImplementationOnce(() => Promise.reject(new Error("Disk full")))

      const result = await withTempDir(async () => {
        return "success"
      }, "error")

      expect(result).toBe("error")
    })

    test("cleanup on error", async () => {
      let tempPath = ""
      await withTempDir(async (_, absolute) => {
        tempPath = absolute
        throw new Error("Operation failed")
      }, "error")

      expect(mockFs.rm).toHaveBeenCalledWith(tempPath, { recursive: true, force: true })
    })
  })

  describe("writeInputFile", () => {
    test("empty content", async () => {
      await writeInputFile("/test", "")
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("/test/input/code.kt"),
        "",
        expect.objectContaining({
          encoding: "utf-8",
          flag: "w",
        })
      )
    })

    test("reject very large content", async () => {
      const largeContent = "a".repeat(1024 * 1024 * 6) // 6MB
      expect(writeInputFile("/test", largeContent)).rejects.toThrow("Input file too large")
    })

    test("throw on write error", async () => {
      mockFs.writeFile.mockImplementationOnce(() => Promise.reject(new Error("Write failed")))
      expect(writeInputFile("/test", "content")).rejects.toThrow("Write failed")
    })
  })

  describe("readOutputFile", () => {
    test("throw on missing file", async () => {
      mockFs.readFile.mockImplementationOnce(() => Promise.reject(new Error("ENOENT")))
      expect(readOutputFile("/test")).rejects.toThrow("ENOENT")
    })

    test("empty file", async () => {
      mockFs.readFile.mockImplementationOnce(() => Promise.resolve(""))
      const result = await readOutputFile("/test")
      expect(result).toBe("")
    })

    test("large files", async () => {
      // the compiled code will be much bigger than the input, but there shouldn't be a limit on file size
      const largeContent = "a".repeat(1024 * 1024 * 10) // 10MB
      mockFs.readFile.mockImplementationOnce(() => Promise.resolve(largeContent))
      const result = await readOutputFile("/test")
      expect(result).toBe(largeContent)
    })
  })

  describe("trimErrorMessage", () => {
    test("erros with too much information", () => {
      const error =
        "actual error will be here info: produce executable: /data/js/ something\nbut in some cases, kotlinc-js will add a bunch of information here"
      expect(trimErrorMessage(error)).toBe("actual error will be here ")
    })

    test("errors with reasonable information", () => {
      const error = "input/code.kt:1:1: error: syntax error: Expecting a top level declaration.\ndongs\n^^^^^\nerror: KLIB resolver: Could not find \"klib/\" in [/data]"
      expect(trimErrorMessage(error)).toBe("input/code.kt:1:1: error: syntax error: Expecting a top level declaration.")
    })

    test("empty messages", () => {
      expect(trimErrorMessage("")).toBe("")
    })
  })
})
