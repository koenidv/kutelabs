import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"
import { Connector } from "@kutelabs/editor-mixed/src/connections/Connector"
import { ConnectorRole } from "@kutelabs/editor-mixed/src/connections/ConnectorRole"
import { ConnectorType } from "@kutelabs/editor-mixed/src/connections/ConnectorType"
import { Coordinates } from "@kutelabs/editor-mixed/src/util/Coordinates"
import { describe, expect, test } from "bun:test"
import { mockBlock, mockRootBlock } from "../mocks/basics.mock"
import { mockBlockRegistry } from "../mocks/blockregistry.mock"
import { mockConnectorRegistry } from "../mocks/connectorRegistry.mock"

describe("Block", () => {
  describe("connect", () => {
    test("connects blocks with valid connection", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const connection = new Connection(block1.connectors.after!, block2.connectors.before!)

      block1.connect(mockBlockRegistry(), block2, connection)
      expect(block1.connectedBlocks.isConnected(block2)).toBeTrue()
    })

    test("fails with invalid connection", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const invalidConnection = new Connection(
        new Connector(ConnectorType.After, ConnectorRole.Output, [], new Coordinates(0, 0)),
        block2.connectors.internal
      )

      expect(() => block1.connect(mockBlockRegistry(), block2, invalidConnection)).toThrow()
    })

    test("opposite action", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const connection = new Connection(block1.connectors.after!, block2.connectors.before!)

      block1.connect(mockBlockRegistry(), block2, connection)
      expect(block2.connectedBlocks.isConnected(block1)).toBeTrue()
    })
  })

  describe("disconnectSelf", () => {
    test("removes from upstream block", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const connection = new Connection(block1.connectors.after!, block2.connectors.before!)

      block1.connect(mockBlockRegistry(), block2, connection)
      const disconnected = block2.disconnectSelf(mockBlockRegistry())

      expect(disconnected).toBe(block2)
      expect(block1.downstreamWithConnectors).toHaveLength(0)
      expect(block2.upstream).toBeNull()
    })

    test("fail without upstream connection", () => {
      const block = mockBlock()
      expect(() => block.disconnectSelf(mockBlockRegistry())).toThrow()
    })
  })

  describe("connected blocks", () => {
    test("retrieves upstream block", () => {
      const upstream = mockBlock()
      const block = mockBlock()
      const connection = new Connection(upstream.connectors.after!, block.connectors.before!)

      upstream.connect(mockBlockRegistry(), block, connection)
      expect(block.upstream).toBe(upstream)
    })

    test("retrieves upstream root block", () => {
      const root = mockRootBlock()
      const block = mockBlock()
      const connection = new Connection(root.rootConnector, block.connectors.internal)

      root.connect(mockBlockRegistry(), block, connection)
      expect(block.upstream).toBe(root)
    })

    test("retrieve downstream blocks", () => {
      const block = mockBlock()
      const downstream = mockBlock()
      const connection = new Connection(block.connectors.after!, downstream.connectors.before!)

      block.connect(mockBlockRegistry(), downstream, connection)
      expect(block.downstreamWithConnectors[0].block).toBe(downstream)
    })

    test("get all connected recursive", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const block3 = mockBlock()

      const conn1 = new Connection(block1.connectors.after!, block2.connectors.before!)
      const conn2 = new Connection(block2.connectors.after!, block3.connectors.before!)

      block1.connect(mockBlockRegistry(), block2, conn1)
      block2.connect(mockBlockRegistry(), block3, conn2)

      expect(block1.allConnectedRecursive).toHaveLength(3)
      expect(block1.allConnectedRecursive).toContain(block3)
    })
  })

  describe("data management", () => {
    describe("cloning", () => {
      test("creates identical block with new id", () => {
        const original = mockBlock()

        const clone = original.registerClone(
          mockBlockRegistry() as any,
          mockConnectorRegistry() as any
        )

        expect(clone.id).not.toBe(original.id)
        expect(clone.data).toEqual(original.data)
        expect(clone.type).toBe(original.type)
      })

      test("maintains connector structure", () => {
        const original = mockBlock()
        const clone = original.registerClone(mockBlockRegistry(), mockConnectorRegistry())

        expect(clone.connectors.all.length).toBe(original.connectors.all.length)
      })
    })

    describe("removal", () => {
      test("cleans up registries and references", () => {
        const block = mockBlock()
        const blockRegistry = mockBlockRegistry()
        const connectorRegistry = mockConnectorRegistry()

        block.remove(blockRegistry, connectorRegistry)

        expect(blockRegistry.deregister).toHaveBeenCalledWith(block)
        expect(connectorRegistry.deregisterForBlock).toHaveBeenCalledWith(block)
        expect(block.data).toBeNull()
      })
    })
  })
})
