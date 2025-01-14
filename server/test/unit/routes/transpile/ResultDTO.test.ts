import { ResultDTO } from "@kutelabs/server/src/routes/transpile/ResultDTO"
import { TranspilationStatus } from "@kutelabs/server/src/routes/transpile/Status"
import { describe, expect, test } from "bun:test"

describe("ResultDTO", () => {
  test("recreate from JSON", () => {
    const json = `{"status":"success","transpiledCode":"...","message":null,"cached":true}`
    const result = ResultDTO.fromJSON(json)
    expect(result.status).toBe(TranspilationStatus.Success)
    expect(result.transpiledCode).toBe("...")
    expect(result.message).toBe(null)
    expect(result.cached).toBe(true)
  })

  test("success status from successful transpilation", () => {
    const result = ResultDTO.fromTranspilationResult({
      status: TranspilationStatus.Success,
      transpiled: "transpiled code",
    })
    expect(result.status).toBe(TranspilationStatus.Success)
    expect(result.transpiledCode).toBe("transpiled code")
  })
})
