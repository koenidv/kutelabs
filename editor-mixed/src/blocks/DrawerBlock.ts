import { Connection } from "../connections/Connection"
import type { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import { Block, type AnyBlock } from "./Block"
import { BlockType } from "./configuration/BlockType"

export class DrawerBlock extends Block<BlockType.Root> {
  public readonly drawerConnector: Connector
  constructor(
    blockRegistry: BlockRInterface,
    connectorRegistry: ConnectorRegistry
  ) {
    const drawerConnector = DefaultConnectors.drawer()
    super(
      BlockType.Root,
      null,
      [{connector: drawerConnector}],
      false,
      blockRegistry,
      connectorRegistry
    )
    this.drawerConnector = drawerConnector
  }

  blocks: AnyBlock[] = []

  override silentConnect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction: boolean = false
  ): void {
    if (
      connection.from != this.drawerConnector &&
      connection.to != this.drawerConnector
    )
      throw new Error("Drawer block can only connect on drawer connector")

    if (this.blocks.includes(block)) return

    // Disconnect any connected blocks and attach to drawer individually, but keep order
    const downstreamBlocks = block.downstreamWithConnectors.map(
      ({ block: it }) => block.silentDisconnectBlock(it)
    )

    this.blocks.push(block)
    block.isInDrawer = true
    // todo invalidate block

    downstreamBlocks.forEach(it => {
      if (!it) return
      this.silentConnect(
        it,
        new Connection(this.drawerConnector, it.connectors.internal)
      )
    })

    if (!isOppositeAction) block.silentConnect(this, connection, atPosition, true)
  }

  override silentDisconnectBlock(block: AnyBlock): AnyBlock | null {
    const index = this.blocks.indexOf(block)
    if (index !== -1) this.blocks.splice(index, 1)

    if (block.connectedBlocks.isConnected(this)) block.silentDisconnectBlock(this)
    block.isInDrawer = false
    return block
  }

  public clear() {
    this.blocks = []
  }
}
