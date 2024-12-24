import { Block, type AnyBlock } from "../blocks/Block"
import type { BlockDataVariableInit } from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import type { ValueDataType } from "../blocks/configuration/ValueDataType"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRInterface } from "../registries/ConnectorRInterface"
import type { VariableHInterface } from "./VariableHInterface"

type VariableData = BlockDataVariableInit<any> & {
  drawerBlock: AnyBlock
  usages: Block<BlockType.Variable>[]
}

/**
 * side effect / helper class
 * This helper tracks init blocks in the workspace to provide information about available variables
 * It adds variable blocks to the drawer for available variables and removes variable usages when the init block is removed
 * Variables reported here are not necessarily available in a given scope, they're just declared somewhere in the workspaces
 */
export class VariableHelper implements VariableHInterface {
  private variables = new Map<Block<BlockType.VarInit>, VariableData>()
  private pendingUsages: Block<BlockType.Variable>[] = [] // stores variables that are used before the init block is added to the workspace; this should only happen during block loading

  private readonly blockRegistry: BlockRInterface
  private readonly connectorRegistry: ConnectorRInterface
  private readonly requestUpdate: () => void

  constructor(
    blockRegistry: BlockRInterface,
    connectorRegistry: ConnectorRInterface,
    requestUpdate: () => void
  ) {
    blockRegistry.on("workspaceAdded", ({ block }) => this.onBlockAddedToWorkspace(block))
    blockRegistry.on("workspaceRemoved", ({ block }) => this.onBlockRemovedFromWorkspace(block))

    this.blockRegistry = blockRegistry
    this.connectorRegistry = connectorRegistry
    this.requestUpdate = requestUpdate
  }

  private onBlockAddedToWorkspace = (block: AnyBlock) => {
    if (block.type === BlockType.VarInit)
      return this.handleVarInitAdded(block as Block<BlockType.VarInit>)
    if (block.type === BlockType.Variable)
      return this.handleVarBlockAdded(block as Block<BlockType.Variable>)
  }

  /**
   * When a variable initialization block is added to the workspace,
   * this adds a variable use block to the drawer and tracks the variable for later use.
   * This also applies any pending variable uses.
   * @param block VarInit block that was just added to the workspace
   */
  private handleVarInitAdded = (block: Block<BlockType.VarInit>) => {
    if (this.variables.has(block)) {
      console.error("Added var init block to workspace but block is already tracked:", block)
      return
    }
    const drawerBlock = new Block<BlockType.Variable>(
      BlockType.Variable,
      { name: block.data.name },
      DefaultConnectors.byBlockType(BlockType.Variable).map(connector => ({ connector })),
      true,
      this.blockRegistry,
      this.connectorRegistry
    )
    this.blockRegistry.attachToDrawer(drawerBlock, -1)

    const matchingPendingUsages = this.pendingUsages.filter(
      usage => usage.data.name === block.data.name
    )
    if (matchingPendingUsages.length > 0)
      this.pendingUsages = this.pendingUsages.filter(usage => usage.data.name !== block.data.name)

    this.variables.set(block as Block<BlockType.VarInit>, {
      name: block.data.name,
      type: block.data.type,
      mutable: block.data.mutable,
      usages: matchingPendingUsages,
      drawerBlock,
    })

    this.requestUpdate()
  }

  /**
   * When a variable block is added to the workspace, this tracks the usage of the variable
   * This is required to remove the usage when the variable is removed
   * or update connections on a variable type change
   * @param block Variable use block that was just added to the workspace
   */
  private handleVarBlockAdded = (block: Block<BlockType.Variable>) => {
    const data = this.dataByVarName(block.data.name)
    if (!data) {
      console.info(`Variable '${block.data.name}' used but not yet initialized. This should only happen during block loading. block id`, block.id)
      this.pendingUsages.push(block)
      return
    }
    data.usages.push(block)
    block.data.VariableHelper = new WeakRef(this)
  }

  private onBlockRemovedFromWorkspace = (block: AnyBlock) => {
    if (block.type === BlockType.VarInit)
      return this.handleVarInitRemoved(block as Block<BlockType.VarInit>)
    if (block.type === BlockType.Variable)
      return this.handleVarBlockRemoved(block as Block<BlockType.Variable>)
  }

  /**
   * When a variable initialization block is removed from the workspace,
   * remove all uses of the variable and the variable use block from the drawer.
   * Variable blocks can be disconnected and deleted without worrying about downstream connections, as they are always leafs
   * @param block VarInit block that was just removed from the workspace
   */
  private handleVarInitRemoved = (block: Block<BlockType.VarInit>) => {
    if (this.variables.has(block as Block<BlockType.VarInit>)) {
      // remove drawer block
      const data = this.variables.get(block as Block<BlockType.VarInit>)!
      this.blockRegistry.drawer?.removeBlock(data.drawerBlock)
      data.drawerBlock.remove(this.blockRegistry, this.connectorRegistry)

      // remove usages
      for (const usage of data.usages) {
        usage.disconnectSelf(null)
        usage.remove(this.blockRegistry, this.connectorRegistry)
      }

      this.variables.delete(block as Block<BlockType.VarInit>)
      this.requestUpdate()
    }
  }

  /**
   * Untrack variable uses when the use block is removed from the workspace
   * @param block Variable use block that was just removed from the workspace
   */
  private handleVarBlockRemoved = (block: Block<BlockType.Variable>) => {
    const data = this.dataByVarName(block.data.name)
    if (!data) {
      console.error("Variable init for removed usage was not registered", block)
      return
    }
    data.usages = data.usages.filter(usage => usage !== block)
  }

  /**
   * Finds a variable by its name
   * @param name variable name
   * @returns variable data or null if not found
   */
  private dataByVarName(name: string): VariableData | null {
    return [...this.variables.values()].find(data => data.name === name) ?? null
  }

  /**
   * Checks if a variable name is available
   * @param name variable name to test
   * @returns true if the name is available, false if it's already registered or invalid
   */
  public isNameAvailable(name: string): boolean {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return false
    for (const { name: registeredName } of this.variables.values())
      if (registeredName === name) return false
    return true
  }

  /**
   * Get a list of all currently registered variables
   * @returns list of variable init data
   */
  public getVariables(): BlockDataVariableInit<any>[] {
    return [...this.variables.entries()].map(([_initBlock, data]) => ({
      name: data.name,
      type: data.type,
      mutable: data.mutable,
    }))
  }

  /**
   * Get the type of a variable by its name
   * @param name variable name
   * @returns variable type or undefined if the variable is not registered
   */
  public getVariableType(name: string): ValueDataType | undefined {
    return this.dataByVarName(name)?.type
  }

  /**
   * Get the mutability of a variable by its name
   * @param name variable name
   * @returns true if the variable is mutable, false if it's constant, undefined if the variable is not registered
   */
  public getVariableMutable(name: string): boolean | undefined {
    return this.dataByVarName(name)?.mutable
  }
}
