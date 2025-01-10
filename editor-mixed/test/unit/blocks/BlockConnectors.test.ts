import { describe, test, expect } from "bun:test"
import { mockBlock, mockConnectorAfter, mockConnectorExtensionInput } from "../mocks/basics.mock"
import { BlockConnectors } from "@kutelabs/editor-mixed/src/blocks/BlockConnectors"
import { mockBlockRegistry } from "../mocks/blockregistry.mock"
import { Connector } from "@kutelabs/editor-mixed/src/connections/Connector"
import { ConnectorType } from "@kutelabs/editor-mixed/src/connections/ConnectorType"
import { ConnectorRole } from "@kutelabs/editor-mixed/src/connections/ConnectorRole"

describe("BlockConnectors", () => {
  describe("addConnector", () => {
    test("registers connector", () => {
      const connector = mockConnectorAfter()
      const registry = mockBlockRegistry()
      registry.register.mockImplementationOnce(() => {})
      const blockConnectors = new BlockConnectors()

      blockConnectors.addConnector(mockBlock(), registry, connector)

      expect(registry.register).toHaveBeenCalledWith(connector)
    })
  })

  describe("byRole", () => {
    test("finds connectors across types", () => {
      const regularInputConnector = mockConnectorExtensionInput()
      const innerInputConnector = new Connector(ConnectorType.Inner, ConnectorRole.Input)
      const afterInputConnector = new Connector(ConnectorType.After, ConnectorRole.Input)
      // const afterConnector = ConnectorAfter()
      const block = mockBlock()
      const registry = mockBlockRegistry()
      const blockConnectors = new BlockConnectors()

      ;[regularInputConnector, innerInputConnector, afterInputConnector].forEach(
        connector => blockConnectors.addConnector(block, registry, connector)
      )

      const byrole = blockConnectors.byRole(ConnectorRole.Input)

      expect(byrole).toHaveLength(3)
      expect(byrole).toContain(regularInputConnector)
      expect(byrole).toContain(innerInputConnector)
      expect(byrole).toContain(afterInputConnector)
    })
  })
})
