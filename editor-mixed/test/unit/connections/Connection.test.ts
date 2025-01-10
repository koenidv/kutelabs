import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"
import { describe, expect, test } from "bun:test"
import { mockBlock, mockConnectorAfter } from "../mocks/basics.mock"

describe("Connection", () => {
  test("identify local connector", () => {
    const localAfter = mockConnectorAfter()
    const localBlock = mockBlock({ after: { connector: localAfter } })
    const remoteBlock = mockBlock()
    const fromLocalConnection =new  Connection(localAfter, remoteBlock.connectors.before!)
    const toLocalConnection = new Connection(remoteBlock.connectors.before!, localAfter)

    expect(fromLocalConnection.localConnector(localBlock)).toBe(localAfter)
    expect(toLocalConnection.localConnector(localBlock)).toBe(localAfter)
  })
})