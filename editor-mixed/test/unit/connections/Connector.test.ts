import { describe, test, expect } from "bun:test"
import { mockConnectorAfter } from "../mocks/basics.mock"
import { mockConnectorRegistry } from "../mocks/connectorRegistry.mock"
import { ConnectorType } from "@kutelabs/editor-mixed/src/connections/ConnectorType"
import { Connector } from "@kutelabs/editor-mixed/src/connections/Connector"

describe("Connector", () => {
  describe("register", () => {
    test("calls registry", () => {
      const connector = mockConnectorAfter()
      const registry = mockConnectorRegistry()
      registry.register.mockImplementationOnce(() => {})

      connector.register(registry, { id: "block" } as any)

      expect(registry.register).toHaveBeenCalledWith(connector)
    })

    test("disallow parent change", () => {
      const connector = mockConnectorAfter()
      const registry = mockConnectorRegistry()
      registry.register.mockImplementationOnce(() => {})

      connector.register(registry, { id: "block" } as any)
      expect(() => connector.register(registry, { id: "another-block" } as any)).toThrow()
      expect(registry.register).toHaveBeenCalledTimes(1)
    })
  })
})

describe("isDownstream", () => {
  test.each([
    [ConnectorType.After, true],
    [ConnectorType.Inner, true],
    [ConnectorType.Extension, true],
    [ConnectorType.Before, false],
    [ConnectorType.Internal, false],
  ])("type %p downstream: %p", (type, expected) => {
    const connector = new Connector(type)
    expect(connector.isDownstream).toBe(expected)
  })
})
