import { ConnectedBlocks } from "@kutelabs/editor-mixed/src/blocks/ConnectedBlocks"
import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"
import { describe, expect, mock, spyOn, test } from "bun:test"
import { mockBlock, mockConnectorAfter, mockConnectorBefore } from "../mocks/basics.mock"
import { mockBlockRegistry } from "../mocks/blockregistry.mock"

describe("ConnectedBlocks", () => {
  describe("insertForConnector", () => {
    test("retrievable by connector", () => {
      const connectedBlocks = new ConnectedBlocks()
      const block = mockBlock()
      const connector = mockConnectorBefore()
      connectedBlocks.insertForConnector(block, connector, mock())
      expect(connectedBlocks.byConnector(connector)).toBe(block)
    })

    test("pop previous block", () => {
      const connectedBlocks = new ConnectedBlocks()
      const connector = mockConnectorBefore()
      connectedBlocks.insertForConnector(mockBlock(), connector, mock())
      const popHandler = spyOn(ConnectedBlocks.prototype, "handlePopBlock" as keyof ConnectedBlocks)
      const newBlock = mockBlock()

      connectedBlocks.insertForConnector(newBlock, connector, mock())
      expect(popHandler).toHaveBeenCalledWith(connector, newBlock, expect.any(Function))
    })
  })

  describe("handlePopBlock", () => {
    test("attach to end of stack", () => {
      const registry = mockBlockRegistry()
      const stackStartAfter = mockConnectorAfter()
      const stackStart = mockBlock({
        after: { connector: stackStartAfter },
        connectToRoot: true,
      })
      const connectedBlocks = stackStart.connectedBlocks

      const stackEndBefore = mockConnectorBefore()
      const stackEnd = mockBlock({
        before: { connector: stackEndBefore },
        connectToRoot: true,
      })
      stackEnd.connect(registry, stackStart, new Connection(stackEndBefore, stackStartAfter))

      const insertOnRoot = mock()

      const insertBlock = mockBlock({ connectToRoot: true })
      connectedBlocks.insertForConnector(insertBlock, stackStartAfter, insertOnRoot)

      expect(insertBlock.after).toBe(stackEnd)
      expect(stackEnd.before).toBe(insertBlock)
      expect(insertOnRoot).not.toHaveBeenCalled()
    })

    test("attach to root without matching connector", () => {
      const registry = mockBlockRegistry()
      const stackStartAfter = mockConnectorAfter()
      const stackStart = mockBlock({
        after: { connector: stackStartAfter },
        connectToRoot: true,
      })
      const connectedBlocks = stackStart.connectedBlocks

      const stackEndBefore = mockConnectorBefore()
      const stackEnd = mockBlock({
        before: { connector: stackEndBefore },
        connectToRoot: true,
      })
      stackEnd.connect(registry, stackStart, new Connection(stackEndBefore, stackStartAfter))

      const insertOnRoot = mock()

      const insertBlock = mockBlock({ after: false, connectToRoot: true })
      connectedBlocks.insertForConnector(insertBlock, stackStartAfter, insertOnRoot)

      expect(insertBlock.after).toBe(null)
      expect(insertOnRoot).toHaveBeenCalled()
    })
  })
})
