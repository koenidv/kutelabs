import type { AnyBlock } from "../blocks/Block"
import { BlockType } from "../blocks/configuration/BlockType"
import { DrawerBlock } from "../blocks/DrawerBlock"
import { RootBlock } from "../blocks/RootBlock"
import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import type { SizeProps } from "../render/SizeProps"
import { Coordinates } from "../util/Coordinates"
import { Emitter } from "../util/Emitter"
import type { BlockRInterface } from "./BlockRInterface"
import type { ConnectorRegistry } from "./ConnectorRegistry"
import { RegisteredBlock, type AnyRegisteredBlock } from "./RegisteredBlock"

type events = {
  workspaceAdded: { block: AnyBlock }
  workspaceRemoved: { block: AnyBlock }
}

// todo implement worksapce events, for this all block movement should go through the registry

export class BlockRegistry extends Emitter<events> implements BlockRInterface {
  private _root: RootBlock | null = null
  public get root() {
    return this._root
  }

  private _drawer: DrawerBlock | null = null
  public get drawer() {
    return this._drawer
  }

  constructor(connectorRegistry: ConnectorRegistry) {
    super()
    this._root = new RootBlock(this, connectorRegistry)
    this._drawer = new DrawerBlock(this, connectorRegistry)
  }

  _blocks: Map<AnyBlock, AnyRegisteredBlock> = new Map()
  public register(block: AnyBlock) {
    if (this._blocks.has(block)) throw new Error("Block is already registered")
    this._blocks.set(block, new RegisteredBlock(block))
  }
  public getRegisteredById(id: string) {
    return [...this._blocks.values()].find(it => it.block.id == id)
  }

  public setSize(block: AnyBlock, size: SizeProps): AnyRegisteredBlock {
    const registered = this._blocks.get(block)
    if (!registered) throw new Error("Block is not registered")
    registered.size = size
    return registered
  }

  public getSize(block: AnyBlock): SizeProps {
    const registered = this._blocks.get(block)
    if (!registered) throw new Error("Block is not registered")
    if (registered.size == null) throw new Error("Block size is not set")
    return registered.size
  }

  public setPosition(block: AnyBlock, position: Coordinates): AnyRegisteredBlock {
    const registered = this._blocks.get(block)
    if (!registered) throw new Error("Block is not registered")
    registered.globalPosition = position
    return registered
  }

  getPosition(block: AnyBlock): Coordinates {
    const registered = this._blocks.get(block)
    if (!registered) throw new Error("Block is not registered")
    return registered.globalPosition
  }

  public attachToRoot(
    block: AnyBlock | null,
    modifyPosition: (current: Coordinates) => Coordinates
  ) {
    if (!this._root) throw new Error("Root is not set")
    this.attach(block, this._root, this._root.rootConnector, modifyPosition)
  }

  public attachToDrawer(block: AnyBlock | null) {
    if (!this._drawer) throw new Error("Drawer is not set")
    this.attach(block, this._drawer, this._drawer.drawerConnector, () => Coordinates.zero)
    if (block) this.emit("workspaceRemoved", { block })
  }

  private attach(
    block: AnyBlock | null,
    to: RootBlock | DrawerBlock,
    on: Connector,
    modifyPosition: (c: Coordinates) => Coordinates
  ) {
    if (!block) return
    const registered = this._blocks.get(block)
    if (!registered) throw new Error("Block is not registered")
    to.connect(
      block,
      new Connection(on, block.connectors.internal),
      modifyPosition(registered.globalPosition)
    )
  }

  detachedBlockIds: string[] = []
  public setDetached(block: AnyBlock | null) {
    if (block == null) {
      this.detachedBlockIds = []
      return
    }
    this.detachedBlockIds = [block.id, ...block.allConnectedRecursive.map(({ id }) => id)]
  }

  public get leafs(): AnyBlock[] {
    return [...this._blocks.keys()].filter(
      b =>
        b.downstreamWithConnectors.length === 0 &&
        b.type !== BlockType.Root &&
        !this.detachedBlockIds.includes(b.id)
    )
  }
  public downstreamBlocksMeasuredAndValid(block: AnyBlock): boolean {
    for (const connected of block.downstreamWithConnectors) {
      const registered = this._blocks.get(connected.block)
      if (!registered) throw new Error("Block is not registered")
      if (registered.isInvalidated || registered.size == null) return false
    }
    return true
  }

  public clear() {
    this._blocks.clear()
    this._root?.clear()
    this._drawer?.clear()
  }
}
