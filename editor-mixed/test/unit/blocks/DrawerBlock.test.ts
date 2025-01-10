import { describe, test, mock, expect } from "bun:test"
import {
  mockBlock,
  mockConnectorAfter,
  mockConnectorBefore,
  mockDrawerBlock,
} from "../mocks/basics.mock"
import { mockBlockRegistry } from "../mocks/blockregistry.mock"
import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"
import { BlockType } from "@kutelabs/editor-mixed/src/blocks/configuration/BlockType"

describe("DrawerBlock", () => {
  describe("connect", () => {
    test("store connected blocks", () => {
      const block = mockBlock()
      const drawer = mockDrawerBlock()

      drawer.connect(
        mockBlockRegistry(),
        block,
        new Connection(drawer.drawerConnector, block.connectors.internal)
      )

      const blocks = drawer.blocks

      expect(blocks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            block: block,
          }),
        ])
      )
      expect(blocks).toHaveLength(1)
    })

    test("seperate connected blocks", () => {
      const after1 = mockConnectorAfter()
      const block1 = mockBlock({ after: { connector: after1 }, connectToRoot: true })
      const before2 = mockConnectorBefore()
      const block2 = mockBlock({
        type: BlockType.Conditional,
        before: { connector: before2 },
        connectToRoot: true,
      })
      block1.connect(mockBlockRegistry(), block2, new Connection(after1, before2))
      const drawer = mockDrawerBlock()

      drawer.connect(
        mockBlockRegistry(),
        block1,
        new Connection(drawer.drawerConnector, block1.connectors.internal)
      )

      const blocks = drawer.blocks

      expect(blocks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            block: block1,
          }),
          expect.objectContaining({
            block: block2,
          }),
        ])
      )
      expect(blocks).toHaveLength(2)
    })

    test("de-duplicate blocks", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const drawer = mockDrawerBlock()
      const registry = mockBlockRegistry()

      drawer.connect(
        registry,
        block1,
        new Connection(drawer.drawerConnector, block1.connectors.internal)
      )
      drawer.connect(
        registry,
        block2,
        new Connection(drawer.drawerConnector, block2.connectors.internal)
      )

      const blocks = drawer.blocks

      expect(blocks).toHaveLength(1)
    })

    test("connect opposite action", () => {
      const block = mockBlock()
      const drawer = mockDrawerBlock()

      drawer.connect(
        mockBlockRegistry(),
        block,
        new Connection(drawer.drawerConnector, block.connectors.internal),
        undefined,
        2
      )

      expect(block.connectedBlocks.isConnected(drawer)).toBe(true)
    })

    test("calls notifyConnecting", () => {
      const block = mockBlock()
      const drawer = mockDrawerBlock()
      const registry = mockBlockRegistry()
      registry.notifyConnecting.mockImplementationOnce(() => {})

      drawer.connect(
        registry,
        block,
        new Connection(drawer.drawerConnector, block.connectors.internal),
      )

      expect(registry.notifyConnecting).toHaveBeenCalledWith(block, drawer)
    })
  })
})
