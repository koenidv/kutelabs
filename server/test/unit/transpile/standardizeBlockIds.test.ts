import {
  restoreBlockIds,
  standardizeBlockIds,
} from "@kutelabs/server/src/transpile/standardizeBlockIds"
import { describe, test, expect } from "bun:test"

describe("block id standardization", () => {
  test("standardization removes original ids", () => {
    const code = `markBlock("a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1");\ntest();\nmarkBlock("b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1");\mtest();`
    const { code: standardized } = standardizeBlockIds(code)
    expect(standardized).not.toMatch(/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1/)
    expect(standardized).not.toMatch(/b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1/)
  })

  test("output is independent of block ids in code", () => {
    const code1 = `markBlock("a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1");\ntest();\nmarkBlock("b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1");\mtest();`
    const code2 = `markBlock("b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1");\ntest();\nmarkBlock("c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1");\mtest();`
    const { code: standardized1 } = standardizeBlockIds(code1)
    const { code: standardized2 } = standardizeBlockIds(code2)
    expect(standardized1).toBe(standardized2)
  })

  test("standardization does not affect remaining code", () => {
    const code = `markBlock("a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1");\ntest();\nmarkBlock("b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1");\mtest();special.code();\nreturn 0;`
    const { code: standardized } = standardizeBlockIds(code)
    expect(standardized).toMatch(
      /markBlock\("[^"]+"\);\ntest\(\);\nmarkBlock\("[^\"]+"\);\mtest\(\);special.code\(\);\nreturn 0;/
    )
  })

  test("standardization only applies in markBlock calls", () => {
    const code = `"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";markBlock("b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1")`
    const { code: standardized, ids } = standardizeBlockIds(code)
    expect([ids.entries()]).toHaveLength(1)
    expect(standardized).toMatch(/"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";markBlock\("[^\"]+"\)/)
  })
})

describe("block id standardization-restoration", () => {
  test("restored correctly after standardization", () => {
    const code = `markBlock("a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1");\ntest();\nmarkBlock("b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1");\mtest();`
    const { code: standardized, ids } = standardizeBlockIds(code)
    const restored = restoreBlockIds(standardized, ids)
    expect(restored).toBe(code)
  })
})
