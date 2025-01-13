import type { AnyBlock, Block } from "../blocks/Block"
import type { BlockDataByType } from "../blocks/configuration/BlockData"
import type { BlockType } from "../blocks/configuration/BlockType"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRInterface } from "../registries/ConnectorRInterface"
import type { DataType } from "../schema/blocks"

export type TrackedData<
  Tracked extends Block<BlockType, DataType>,
  Usage extends AnyBlock,
> = BlockDataByType<
  Tracked extends Block<infer T, any> ? T : never,
  Tracked extends Block<BlockType.VarInit, infer D> ? D : never
> & {
  drawerBlock?: AnyBlock
  usages: Usage[]
}

/**
 * Side Effects perform additional tasks when specific blocks are added to the workspace
 */
export abstract class BaseSideEffect<
  Tracked extends Block<BlockType, DataType>,
  Usage extends AnyBlock,
> {
  protected tracked = new Map<Tracked, TrackedData<Tracked, Usage>>()
  protected pendingUsages: Usage[] = [] // stores variables that are used before the init block is added to the workspace; this should only happen during block loading

  protected readonly blockRegistry: BlockRInterface
  protected readonly connectorRegistry: ConnectorRInterface
  protected readonly requestUpdate: () => void

  constructor(
    blockRegistry: BlockRInterface,
    connectorRegistry: ConnectorRInterface,
    requestUpdate: () => void
  ) {
    blockRegistry.on("workspaceAdded", ({ block }) => this.onBlockAddedToWorkspace(block))
    blockRegistry.on("workspaceRemoved", ({ block }) => this.onBlockRemovedFromWorkspace(block))
    blockRegistry.on("registeredClone", ({ block }) => this.onRegisteredClone(block))

    this.blockRegistry = blockRegistry
    this.connectorRegistry = connectorRegistry
    this.requestUpdate = requestUpdate
  }

  /**
   * Perform side-effect
   * Called when a block was added to the workspace
   * @param block block that was added to the workspace
   */
  protected abstract onBlockAddedToWorkspace(block: AnyBlock): void

  /**
   * Clean-up side-effect
   * Called when a block was removed from th workspace
   * @param block block that was removed from the workspace
   */
  protected abstract onBlockRemovedFromWorkspace(block: AnyBlock): void

  /**
   * Perform side-effect on new clones
   * Called when a block is cloned
   * @param block new clone
   */
  protected abstract onRegisteredClone(block: AnyBlock): void
}
