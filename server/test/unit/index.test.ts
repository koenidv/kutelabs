import { describe, expect, mock, test } from "bun:test"
import { app } from "../../src"

mock.module("hono/bun", () => ({
  getConnInfo: mock(() => ({ remote: { address: "mocked" } })),
}))

mock.module("../../src/transpile/transpile", () => ({
  transpile: mock(async (_code: string) => ({ status: "success", transpiled: "mocked" })),
}))

describe("route:transpile", () => {
  describe("POST /kt/js", () => {
    test.skip("respond with transpiled code", async () => {
      const res = await app.request("/transpile/kt/js", {
        method: "POST",
        body: JSON.stringify({ kotlinCode: "println(1)" }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.status).toBe("success")
      expect(body.transpiledCode).toBe("mocked")
    })
  })
})
