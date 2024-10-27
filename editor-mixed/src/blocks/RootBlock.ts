import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import { Coordinates } from "../util/Coordinates"
import { Block, type AnyBlock } from "./Block"
import { BlockType } from "./BlockType"

export type BlockAndCoordinates = { block: AnyBlock; position: Coordinates }

export class RootBlock extends Block<BlockType.Root> {
  constructor() {
    super(null, BlockType.Root, null, [Connector.Root], false)
  }

  blocks: BlockAndCoordinates[] = []

  override connect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction: boolean = false
  ): void {
    if (connection.from != Connector.Root && connection.to != Connector.Root)
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
    values.forEach(({ block, position }, _) =>
      this.connect(
        block,
        new Connection(Connector.Root, block.connectors.internal),
        position
      )
    )
  }

  private findIndex(block: AnyBlock) {
    return this.blocks.findIndex(b => b.block === block)
  }
}
