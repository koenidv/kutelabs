import type { Block } from "../blocks/Block"
import type { RootBlock } from "../blocks/RootBlock"
import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import type { Coordinates } from "../util/Coordinates"
import { RegisteredBlock } from "./RegisteredBlock"

export class BlockRegistry {
  private static _instance: BlockRegistry | null = null
  static get instance(): BlockRegistry {
    if (!BlockRegistry._instance) BlockRegistry._instance = new BlockRegistry()
    return BlockRegistry._instance
  }

  private _root: RootBlock | null = null
  public set root(value: RootBlock | null) {
    this._root = value
  }

  _blocks: WeakMap<Block, RegisteredBlock> = new WeakMap()
  public register(block: Block) {
    if (this._blocks.has(block)) throw new Error("Block is already registered")
    this._blocks.set(block, new RegisteredBlock(block))
  }

  public attachToRoot(
    block: Block | null,
    modifyPosition: (current: Coordinates) => Coordinates
  ) {
    if (!block) return
    if (!this._root) throw new Error("Root is not set")
      const registered = this._blocks.get(block)
    if (!registered) throw new Error("Block is not registered")
    this._root.connect(
      block,
      new Connection(Connector.Root, block.connectors.internal),
      modifyPosition(registered.globalPosition)
    )
  }
}
