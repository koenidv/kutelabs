import { Connection } from "../connections/Connection"
import type { BlockAndConnector, Connector } from "../connections/Connector"
import { ConnectorType } from "../connections/ConnectorType"
import { BlockRegistry } from "../registries/BlockRegistry"
import { Coordinates } from "../util/Coordinates"
import { findKeyByValue } from "../util/MapUtils"
import type { AnyBlock } from "./Block"
import { BlockType } from "./configuration/BlockType"

export class ConnectedBlocks {
  blocks: Map<Connector, AnyBlock> = new Map()

  /**
   * Store a block as connected to the given connector,
   * and pop the previously connected block to the workspace root if necessary
   * @param block block to connect
   * @param connector connector to connect the block to
   * @param insertOnRoot function to insert a block to the workspace root
   */
  insertForConnector(
    block: AnyBlock,
    connector: Connector,
    insertOnRoot: typeof BlockRegistry.prototype.attachToRoot
  ) {
    if (this.blocks.has(connector)) this.handlePopBlock(connector, block, insertOnRoot)
    this.blocks.set(connector, block)
  }

  /**
   * Pop the block connected to a given connector to the workspace root,
   * and connect the new block to the connector
   * @param connector connector to pop the block for
   * @param newBlock block that is being connected to the connector
   * @param insertOnRoot function to insert a block to the workspace root
   */
  private handlePopBlock(
    connector: Connector,
    newBlock: AnyBlock,
    insertOnRoot: typeof BlockRegistry.prototype.attachToRoot
  ) {
    if (!connector.isDownstram) console.warn("Popping block on upstream connector", connector)
    const popped = (
      connector.isDownstram ? this.byConnector(connector) : connector.parentBlock
    )?.disconnectSelf(null)
    if (!popped) return

    // todo extension blocks / chains

    const lastAfter = newBlock.lastAfter
    if (
      (connector.type == ConnectorType.After || connector.type === ConnectorType.Inner) &&
      lastAfter.connectors.after &&
      popped.connectors.before
    ) {
      return lastAfter.silentConnect(
        popped,
        new Connection(lastAfter.connectors.after, popped.connectors.before),
        Coordinates.zero
      )
    }

    insertOnRoot(popped, curr => {
      return Coordinates.addPopOffset(curr)
    })
  }

  /**
   * Check if the connected blocks contain a given block, i.e. the parent block is connected to it
   * @param to block to check if it is connected
   * @returns true if the block is connected
   */
  isConnected(to: AnyBlock): boolean {
    return [...this.blocks.values()].includes(to)
  }

  /**
   * Get the block connected to a given connector
   * @param connector connector to get the connected block for
   * @returns connected block or null if no block is connected
   */
  byConnector(connector: Connector | null): AnyBlock | null {
    if (connector === null) return null
    return this.blocks.get(connector) || null
  }

  /**
   * All downstream connected blocks including the connectors they are connected to
   */
  get downstream(): BlockAndConnector[] {
    return [...this.blocks]
      .filter(([connector, _block]) => connector.isDownstram)
      .map(([connector, block]) => ({ block, connector }))
  }

  /**
   * Remove a given block from the connected blocks
   * @param block block to remove
   * @returns the removed block or null if no block was found
   */
  popBlock(block: AnyBlock): BlockAndConnector | null {
    const connector = findKeyByValue(this.blocks, block)
    if (!connector) return null
    const popped = this.popForConnector(connector)
    if (!popped) return null
    return { block: popped, connector }
  }

  /**
   * Remove the block on a given connector from the connected blocks
   * @param connector connector to remove the block from
   * @returns the removed block or null if no block was found
   */
  popForConnector(connector: Connector): AnyBlock | null {
    const block = this.blocks.get(connector) ?? null
    this.blocks.delete(connector)
    return block
  }

  /**
   * Check all connections against the current block state,
   * and pop them to root if the connection's predicates no longer allow the connection
   * @param insertOnRoot function to insert a block to the workspace root
   * @returns true if any block was popped
   */
  reevaluateConnections(insertOnRoot: typeof BlockRegistry.prototype.attachToRoot): boolean {
    let anyPopped = false
    this.downstream.forEach(({ connector, block }) => {
      if (!block.upstreamConnectorInUse) {
        console.error("Block to reevaluate has no upstream connector in use", block)
        return
      }
      if (!connector.connectPredicates.allows(block.upstreamConnectorInUse)) {
        console.info("Reevaluated block and found that it is no longer compatible", block)
        const popped = block.disconnectSelf(null)
        if (!popped) throw new Error("Block failed to disconnect itself")
        insertOnRoot(popped, curr => {
          return Coordinates.addPopOffset(curr)
        })
        anyPopped = true
      }
    })
    return anyPopped
  }
}
