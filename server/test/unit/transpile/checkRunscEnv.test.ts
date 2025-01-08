import { checkRunscEnvironment } from "@kutelabs/server/src/transpile/checkRunscEnv"
import {
  beforeEach,
  describe,
  expect,
  mock,
  test
} from "bun:test"

const exitMock = mock()

const mockEnv = {} as any
mock.module("../../../src/env", () => ({ ...mockEnv, env: mockEnv }))

describe("checkRunscEnv", () => {
  beforeEach(() => {
    exitMock.mockClear()
  })

  test("runsc not available in production", async () => {
    mockEnv.ENV = "production"
    await checkRunscEnvironment(exitMock)
    expect(exitMock).toHaveBeenCalledWith(1)
    delete mockEnv.ENV
  })

  test("runsc not available in dev", async () => {
    mockEnv.ENV = "development"
    await checkRunscEnvironment(exitMock)
    expect(exitMock).not.toHaveBeenCalled()
    delete mockEnv.ENV
  })
})
