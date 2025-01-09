import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"
import { describe, expect, test } from "bun:test"
import { BlockExpression, ConnectorAfter } from "../mocks/basics.mock"

describe("Connection", () => {
  test("identify local connector", () => {
    const localAfter = ConnectorAfter()
    const localBlock = BlockExpression(undefined, localAfter)
    const remoteBlock = BlockExpression()
    const fromLocalConnection =new  Connection(localAfter, remoteBlock.connectors.before!)
    const toLocalConnection = new Connection(remoteBlock.connectors.before!, localAfter)

    expect(fromLocalConnection.localConnector(localBlock)).toBe(localAfter)
    expect(toLocalConnection.localConnector(localBlock)).toBe(localAfter)
  })
})