import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"
import { Connector } from "@kutelabs/editor-mixed/src/connections/Connector"
import { ConnectorType } from "@kutelabs/editor-mixed/src/connections/ConnectorType"
import { ConnectorRegistry } from "@kutelabs/editor-mixed/src/registries/ConnectorRegistry"
import { Coordinates } from "@kutelabs/editor-mixed/src/util/Coordinates"
import { beforeEach, describe, expect, test } from "bun:test"
import { mockBlock, mockConnectorAfter } from "../mocks/basics.mock"
import { mockBlockRegistry } from "../mocks/blockregistry.mock"

describe("ConnectorRegistry", () => {
  let registry: ConnectorRegistry

  beforeEach(() => {
    registry = new ConnectorRegistry()
  })

  function withPosition(connector: Connector, x: number, y: number): Connector {
    connector.globalPosition = new Coordinates(x, y)
    return connector
  }

  describe("registration", () => {
    test("registers new connector", () => {
      const connector = withPosition(mockConnectorAfter(), 0, 0)
      registry.register(connector)
      expect(registry.connectors).toContain(connector)
    })

    test("deregisters all block connectors", () => {
      const block = mockBlock()
      const connector1 = withPosition(mockConnectorAfter(), 0, 0)
      const connector2 = withPosition(mockConnectorAfter(), 0, 0)
      
      connector1.register(registry, block)
      connector2.register(registry, block)

      registry.deregisterForBlock(block)

      expect(registry.connectors).toHaveLength(0)
    })

    test("keeps other blocks' connectors on deregister", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const connector1 = withPosition(mockConnectorAfter(), 0, 0)
      const connector2 = withPosition(mockConnectorAfter(), 10, 10)

      connector1.register(registry, block1)
      connector2.register(registry, block2)

      registry.deregisterForBlock(block1)

      expect(registry.connectors).toContain(connector2)
      expect(registry.connectors).toHaveLength(1)
    })
  })

  describe("connector selection", () => {
    test("finds closest connector within range", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const sourceConnector = withPosition(mockConnectorAfter(), 0, 0)
      const targetConnector = withPosition(mockConnectorAfter(), 10, 10)
      const farConnector = withPosition(mockConnectorAfter(), 12, 12)

      sourceConnector.register(registry, block1)
      targetConnector.register(registry, block2)
      farConnector.register(registry, block2)

      const closest = registry.getClosestConnector(
        sourceConnector,
        [block1.id],
        new Coordinates(5, 5),
        20
      )

      expect(closest).toBe(targetConnector)
    })

    test("ignores connectors outside range", () => {
      const block1 = mockBlock()
      const block2 = mockBlock()
      const sourceConnector = withPosition(mockConnectorAfter(), 0, 0)
      const farConnector = withPosition(mockConnectorAfter(), 100, 100)

      sourceConnector.register(registry, block1)
      farConnector.register(registry, block2)

      const closest = registry.getClosestConnector(
        sourceConnector,
        [block1.id],
        new Coordinates(0, 0),
        20
      )

      expect(closest).toBeNull()
    })

    test("ignores connectors from ignored blocks", () => {
      const block = mockBlock()
      const selfConnector = withPosition(mockConnectorAfter(), 10, 10)
      const sourceConnector = withPosition(mockConnectorAfter(), 0, 0)

      selfConnector.register(registry, block)
      sourceConnector.register(registry, block)

      const closest = registry.getClosestConnector(
        sourceConnector,
        [block.id],
        new Coordinates(5, 5),
        20
      )

      expect(closest).toBeNull()
    })
  })

  describe("spatial sorting", () => {
    test("sorts connectors by distance", () => {
      const near = withPosition(mockConnectorAfter(), 5, 5)
      const far = withPosition(mockConnectorAfter(), 20, 20)
      const medium = withPosition(mockConnectorAfter(), 10, 10)

      const sorted = registry.sortConnectorsByDistance(new Coordinates(0, 0), [far, near, medium])

      expect(sorted[0]).toBe(near)
      expect(sorted[1]).toBe(medium)
      expect(sorted[2]).toBe(far)
    })

    test("sorts connectors by XY with start position", () => {
      const above = withPosition(mockConnectorAfter(), 0, 0)
      const below = withPosition(mockConnectorAfter(), 0, 20)
      const sameY = withPosition(mockConnectorAfter(), 10, 10)

      const sorted = registry.sortConnectorsXY(10, [above, below, sameY])

      expect(sorted[0]).toBe(below)
      expect(sorted[1]).toBe(above)
      expect(sorted[2]).toBe(sameY)
    })
  })

  describe("upstream connections", () => {
    test("lists available upstream connections", () => {
      const beforeConnector = withPosition(new Connector(ConnectorType.Before, undefined, [(remote) => remote.isDownstream]), 0, 0)
      const block = mockBlock({ before: { connector: beforeConnector }, connectorRegistry: registry })

      const afterConnector = withPosition(mockConnectorAfter(), 10, 10)
      //@ts-ignore, unused but side effect of connector registration
      const targetBlock = mockBlock({ after: { connector: afterConnector }, connectorRegistry: registry })

      const connections = registry.listUpstreamFreeConnections(block)

      console.log(connections.map(c => c.to.type))

      expect(connections).toHaveLength(1)
      expect(connections[0].from).toBe(beforeConnector)
      expect(connections[0].to).toBe(afterConnector)
    })

    test("excludes occupied connectors", () => {
      const beforeConnector = withPosition(new Connector(ConnectorType.Before, undefined, [(remote) => remote.isDownstream]), 0, 0)
      const block = mockBlock({ before: { connector: beforeConnector }, connectorRegistry: registry })

      const occupiedAfter = withPosition(mockConnectorAfter(), 10, 10)
      const targetBlock = mockBlock({ after: { connector: occupiedAfter }, connectorRegistry: registry })
      const occupyingBlock = mockBlock({after: false})
      targetBlock.connect(mockBlockRegistry(), occupyingBlock, new Connection(occupiedAfter, occupyingBlock.connectors.before!))

      const connections = registry.listUpstreamFreeConnections(block)
      expect(connections).toHaveLength(0)
    })
  })

  describe("clear", () => {
    test("removes all connectors", () => {
      const connector1 = withPosition(mockConnectorAfter(), 0, 0)
      const connector2 = withPosition(mockConnectorAfter(), 10, 10)

      registry.register(connector1)
      registry.register(connector2)
      registry.clear()

      expect(registry.connectors).toHaveLength(0)
    })
  })
})
