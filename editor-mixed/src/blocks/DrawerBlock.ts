import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import { objectsEqual1d } from "../util/ObjectUtils"
import { Block, type AnyBlock } from "./Block"
import { BlockType } from "./configuration/BlockType"

export class DrawerBlock extends Block<BlockType.Root> {
  public readonly drawerConnector: Connector

  private readonly blockRegistry: BlockRInterface

  constructor(blockRegistry: BlockRInterface, connectorRegistry: ConnectorRegistry) {
    const drawerConnector = DefaultConnectors.drawer()
    super(
      BlockType.Root,
      null,
      [{ connector: drawerConnector }],
      false,
      blockRegistry,
      connectorRegistry
    )
    this.drawerConnector = drawerConnector

    this.blockRegistry = blockRegistry
  }

  private _blocks: Map<AnyBlock, number> = new Map()
  public get blocks(): { block: AnyBlock; count: number }[] {
    return [...this._blocks.entries()].map(([block, count]) => ({ block, count }))
  }

  override connect(
    registry: BlockRInterface,
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    drawerItemCount: number = -1
  ): void {
    registry.notifyConnecting(block, this)

    // Disconnect any connected blocks and attach to drawer individually, but keep order
    block.downstreamWithConnectors.forEach(({ block: it }) => {
      it.disconnectSelf(registry)?.let(popped => {
        this.connect(
          registry,
          popped,
          new Connection(this.drawerConnector, popped.connectors.internal)
        )
      })
    })

    this.silentConnect(block, connection, atPosition, false, drawerItemCount)
  }

  override silentConnect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction: boolean = false,
    drawerItemCount: number = -1
  ): void {
    if (connection.from != this.drawerConnector && connection.to != this.drawerConnector)
      throw new Error("Drawer block can only connect on drawer connector")

    const matching = this.hasMatchingBlock(block)
    if (matching) {
      this._blocks.set(matching, (this._blocks.get(matching) ?? 0) + drawerItemCount)
      this.blockRegistry.deregister(block)
      return
    }

    this._blocks.set(block, this._blocks.get(block) ?? 0 + drawerItemCount)
    block.isInDrawer = true
    // todo invalidate block

    if (!isOppositeAction) block.silentConnect(this, connection, atPosition, true)
  }

  override silentDisconnectBlock(block: AnyBlock): AnyBlock | null {
    return this.takeBlock(block)
  }

  private takeBlock(block: AnyBlock): AnyBlock {
    const count = this._blocks.get(block) ?? 0
    if (count != 1) {
      this._blocks.set(block, count - 1)
      // the block will have disconnected itself, reconnect to keep double link
      block.silentConnect(
        this,
        new Connection(this.drawerConnector, block.connectors.internal),
        undefined,
        true
      )
      return this.blockRegistry.registerCopyOf(block)
    }
    this._blocks.delete(block)
    if (block.connectedBlocks.isConnected(this)) block.silentDisconnectBlock(this)
    block.isInDrawer = false
    return block
  }

  public clear() {
    this._blocks.clear()
  }

  private hasMatchingBlock(block: AnyBlock): AnyBlock | null {
    if (this._blocks.has(block)) return block
    for (const test of this._blocks.keys())
      if (block.type === test.type && objectsEqual1d(block.data, test.data)) return test
    return null
  }
}
