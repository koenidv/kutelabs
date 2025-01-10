import { describe, test, mock, expect } from "bun:test"
import { mockBlock, mockRootBlock } from "../mocks/basics.mock"
import { mockBlockRegistry } from "../mocks/blockregistry.mock"
import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"

describe("RootBlock", () => {
  describe("connect", () => {
    test("opposite action", () => {
      const block = mockBlock()
      const root = mockRootBlock()

      root.connect(
        mockBlockRegistry(),
        block,
        new Connection(root.rootConnector, block.connectors.internal)
      )

      expect(block.connectedBlocks.isConnected(root)).toBe(true)
    })
  })
})
