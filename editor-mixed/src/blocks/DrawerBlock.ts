import { Connection } from "../connections/Connection"
import type { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import { objectsEqual1d } from "../util/ObjectUtils"
import { Block, type AnyBlock } from "./Block"
import { BlockType } from "./configuration/BlockType"

export class DrawerBlock extends Block<BlockType.Root> {
  public readonly drawerConnector: Connector

  private readonly registerBlock: (block: AnyBlock) => void
  private readonly deregisterBlock: (block: AnyBlock) => void

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

    this.registerBlock = blockRegistry.register.bind(blockRegistry)
    this.deregisterBlock = blockRegistry.deregister.bind(blockRegistry)
  }

  private _blocks: Map<AnyBlock, number> = new Map()
  public get blocks(): AnyBlock[] {
    return [...this._blocks.keys()]
  }

  override connect(
    registry: BlockRInterface,
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates
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

    this.silentConnect(block, connection, atPosition)
  }

  override silentConnect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction: boolean = false
  ): void {
    if (connection.from != this.drawerConnector && connection.to != this.drawerConnector)
      throw new Error("Drawer block can only connect on drawer connector")

    if (this.hasMatchingBlock(block)) return this.deregisterBlock(block)

    this._blocks.set(block, 1)
    block.isInDrawer = true
    // todo invalidate block

    if (!isOppositeAction) block.silentConnect(this, connection, atPosition, true)
  }

  override silentDisconnectBlock(block: AnyBlock): AnyBlock | null {
    this._blocks.delete(block) // todo if count > 1, do not disconnect and return a clone

    if (block.connectedBlocks.isConnected(this)) block.silentDisconnectBlock(this)
    block.isInDrawer = false
    return block
  }

  public clear() {
    this._blocks.clear()
  }

  private hasMatchingBlock(block: AnyBlock): boolean {
    if (this._blocks.has(block)) return true
    for (const test of this._blocks.keys())
      if (block.type === test.type && objectsEqual1d(block.data, test.data)) return true
    return false
  }
}
