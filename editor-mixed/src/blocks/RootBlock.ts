import { Connection } from "../connections/Connection"
import type { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates, type BlockAndCoordinates } from "../util/Coordinates"
import { Block, type AnyBlock } from "./Block"
import { BlockType } from "./configuration/BlockType"

export class RootBlock extends Block<BlockType.Root> {
  public readonly rootConnector: Connector
  constructor(blockRegistry: BlockRInterface, connectorRegistry: ConnectorRegistry) {
    const rootConnector = DefaultConnectors.root()
    super(
      BlockType.Root,
      null,
      [{ connector: rootConnector }],
      false,
      blockRegistry,
      connectorRegistry
    )
    this.rootConnector = rootConnector
  }

  private _blocks: Map<AnyBlock, Coordinates> = new Map()
  public get blocks(): BlockAndCoordinates[] {
    return [...this._blocks].map(([block, position]) => ({ block, position }))
  }

  override silentConnect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction: boolean = false
  ): void {
    if (connection.from != this.rootConnector && connection.to != this.rootConnector)
      throw new Error("Root block can only connect on root connector")

    if (!this._blocks.has(block)) {
      this._blocks.set(block, atPosition ?? Coordinates.zero)
      // todo invalidate block
    }

    if (!isOppositeAction) block.silentConnect(this, connection, atPosition, true)
  }

  override silentDisconnectBlock(block: AnyBlock): AnyBlock | null {
    this._blocks.delete(block)
    if (block.connectedBlocks.isConnected(this)) block.silentDisconnectBlock(this)
    return block
  }

  register(...values: BlockAndCoordinates[]) {
    values.forEach(({ block, position }) =>
      this.silentConnect(
        block,
        new Connection(this.rootConnector, block.connectors.internal),
        position
      )
    )
  }

  public clear() {
    this._blocks.clear()
  }
}
