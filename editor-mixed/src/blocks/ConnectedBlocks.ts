import { Connection } from "../connections/Connection"
import type { BlockAndConnector, Connector } from "../connections/Connector"
import { ConnectorType } from "../connections/ConnectorType"
import { BlockRegistry } from "../registries/BlockRegistry"
import { Coordinates } from "../util/Coordinates"
import { findKeyByValue } from "../util/MapUtils"
import type { AnyBlock } from "./Block"

export class ConnectedBlocks {
  blocks: Map<Connector, AnyBlock> = new Map()

  insertForConnector(block: AnyBlock, connector: Connector) {
    if (this.blocks.has(connector)) this.handlePopBlock(connector, block)
    this.blocks.set(connector, block)
  }

  private handlePopBlock(connector: Connector, newBlock: AnyBlock) {
    if (!connector.isDownstram)
      console.warn("Popping block on upstream connector", connector)
    const popped = (
      connector.isDownstram
        ? this.byConnector(connector)
        : connector.parentBlock
    )?.disconnectSelf()
    if (!popped) return

    // todo extension blocks / chains

    const lastAfter = newBlock.lastAfter
    if (
      (connector.type == ConnectorType.After ||
        connector.type === ConnectorType.Inner) &&
      lastAfter.connectors.after &&
      popped.connectors.before
    ) {
      return lastAfter.connect(
        popped,
        new Connection(lastAfter.connectors.after, popped.connectors.before),
        Coordinates.zero
      )
    }

    BlockRegistry.instance.attachToRoot(popped, curr => {
      return Coordinates.addPopOffset(curr)
    })
  }

  isConnected(to: AnyBlock): boolean {
    return [...this.blocks.values()].includes(to)
  }

  byConnector(connector: Connector | null): AnyBlock | null {
    if (connector === null) return null
    return this.blocks.get(connector) || null
  } 

  popBlock(block: AnyBlock): BlockAndConnector | null {
    const connector = findKeyByValue(this.blocks, block)
    if (!connector) return null
    const popped = this.popForConnector(connector)
    if (!popped) return null
    return { block: popped, connector }
  }

  popForConnector(connector: Connector): AnyBlock | null {
    const block = this.blocks.get(connector) ?? null
    this.blocks.delete(connector)
    return block
  }
}
