import { Connection } from "../connections/Connection"
import type { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates, type BlockAndCoordinates } from "../util/Coordinates"
import { Block, type AnyBlock } from "./Block"
import { BlockType } from "./configuration/BlockType"

export class RootBlock extends Block<BlockType.Root> {
  public readonly rootConnector: Connector
  constructor(
    blockRegistry: BlockRegistry,
    connectorRegistry: ConnectorRegistry
  ) {
    const rootConnector = DefaultConnectors.root()
    super(
      null,
      BlockType.Root,
      null,
      [rootConnector],
      false,
      blockRegistry,
      connectorRegistry
    )
    this.rootConnector = rootConnector
  }

  blocks: BlockAndCoordinates[] = []

  override connect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction: boolean = false
  ): void {
    if (
      connection.from != this.rootConnector &&
      connection.to != this.rootConnector
    )
      throw new Error("Root block can only connect on root connector")

    if (this.findIndex(block) == -1) {
      this.blocks.push({
        block: block,
        position: atPosition ?? Coordinates.zero,
      })
      // todo invalidate block
    }

    if (!isOppositeAction) block.connect(this, connection, atPosition, true)
  }

  override disconnect(block: AnyBlock): AnyBlock | null {
    const index = this.findIndex(block)
    if (index !== -1) this.blocks.splice(index, 1)

    if (block.connectedBlocks.isConnected(this)) block.disconnect(this)
    return block
  }

  register(...values: BlockAndCoordinates[]) {
    values.forEach(({ block, position }) =>
      this.connect(
        block,
        new Connection(this.rootConnector, block.connectors.internal),
        position
      )
    )
  }

  private findIndex(block: AnyBlock) {
    return this.blocks.findIndex(b => b.block === block)
  }

  public clear() {
    this.blocks = []
  }
}
