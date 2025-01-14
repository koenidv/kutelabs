import { Block, type AnyBlock } from "../blocks/Block"
import type { BlockDataVariable, BlockDataVariableInit } from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import type { DataType } from "../blocks/configuration/DataType"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import { BaseSideEffect, type TrackedData } from "./BaseSideEffect"
import type { VariableHInterface } from "./VariableHInterface"

/**
 * side effect / helper class
 * This helper tracks init blocks in the workspace to provide information about available variables
 * It adds variable blocks to the drawer for available variables and removes variable usages when the init block is removed
 * Variables reported here are not necessarily available in a given scope, they're just declared somewhere in the workspaces
 */
export class VariableHelper
  extends BaseSideEffect<Block<BlockType.VarInit, any>, Block<BlockType.Variable>>
  implements VariableHInterface
{
  protected onBlockAddedToWorkspace = (block: AnyBlock) => {
    if (block.type === BlockType.VarInit)
      return this.handleVarInitAdded(block as Block<BlockType.VarInit>)
    if (block.type === BlockType.Variable)
      return this.handleVarBlockAdded(block as Block<BlockType.Variable>)
  }

  /**
   * When a variable initialization block is added to the workspace, this
   * a) starts listening for type and name changes
   * b) adds a variable use block to the drawer
   * c) tracks the variable for later use
   * d) applies any pending variable uses for this variable
   * e) applies the next available variable name if the name is already taken
   * side effect: requests a render update
   * // todo: refactor this massive method
   * @param block VarInit block that was just added to the workspace
   */
  private handleVarInitAdded = (block: Block<BlockType.VarInit>) => {
    if (this.tracked.has(block)) {
      console.error("Added var init block to workspace but block is already tracked:", block)
      return
    }

    const data = block.data
    if (!this.isNameAvailable(data.name)) {
      data.name = this.nextAvailableName(data.name)
      block.data = data
    }

    const drawerBlock = new Block<BlockType.Variable>(
      BlockType.Variable,
      { name: data.name },
      DefaultConnectors.byBlockType(BlockType.Variable).map(connector => ({ connector })),
      true,
      this.blockRegistry,
      this.connectorRegistry
    )
    this.blockRegistry.attachToDrawer(drawerBlock, -1)

    this.tracked.set(block as Block<BlockType.VarInit>, {
      name: data.name,
      type: data.type,
      mutable: data.mutable,
      usages: [drawerBlock],
      drawerBlock,
    })

    const matchingPendingUsages = this.pendingUsages.filter(
      usage => usage.data.name === block.data.name
    )
    if (matchingPendingUsages.length > 0) {
      this.pendingUsages = this.pendingUsages.filter(usage => usage.data.name !== block.data.name)
      if (this.pendingUsages.length == 0)
        console.info("✓ All pending variable usages were resolved")
    }
    matchingPendingUsages.forEach(usage => this.handleVarBlockAdded(usage), this)

    block.on("dataChanged", this.handleBlockDataChanged.bind(this))

    this.requestUpdate()
  }

  /**
   * Propagate changes in variable init blocks to variable use blocks
   * @param changedBlock Variable init block that was changed
   */
  private handleBlockDataChanged = (changedBlock: Block<BlockType.VarInit>) => {
    const currentData = this.tracked.get(changedBlock)
    if (!currentData) return

    let requestUpdate = false

    if (currentData.name !== changedBlock.data.name) {
      const newName = changedBlock.data.name.replaceAll(/[^a-zA-Z0-9]/g, "_")
      if (this.isNameAvailable(newName)) {
        currentData.name = newName
        currentData.usages.forEach(usage => {
          usage.updateData(data => ({ ...data, name: newName }))
        })
        requestUpdate = true
      } else {
        changedBlock.updateData(data => ({ ...data, name: currentData.name }))
      }
    }

    if (currentData.type !== changedBlock.data.type) {
      currentData.type = changedBlock.data.type
      currentData.usages.forEach(usage => {
        if (usage.reevaluateBlocks()) requestUpdate = true
        if (usage.upstream?.reevaluateBlocks()) requestUpdate = true
      })
    }

    if (requestUpdate) this.requestUpdate()
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
      if (window.location.hostname == "localhost" || window.location.hostname.includes("main"))
        console.info(
          `Variable '${block.data.name}' used but not yet initialized. This should only happen during block loading. block id`,
          block.id
        )
      this.pendingUsages.push(block)
      return
    }
    data.usages.push(block)
    block.updateData(data => ({ ...data, variableHelper: new WeakRef(this) }))
  }

  protected onBlockRemovedFromWorkspace = (block: AnyBlock) => {
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
    if (this.tracked.has(block as Block<BlockType.VarInit>)) {
      const data = this.tracked.get(block as Block<BlockType.VarInit>)!
      this.remoteUsages(data)

      block.off("dataChanged", this.handleBlockDataChanged.bind(this))

      this.tracked.delete(block as Block<BlockType.VarInit>)
    }
  }

  /**
   * Removes the drawer block from the drawer, if any, and removes all usages of the variable
   * @param data tracked data of the variable
   */
  private remoteUsages(data: {
    drawerBlock?: Block<BlockType.Variable>
    usages: Block<BlockType.Variable>[]
  }) {
    if (data.drawerBlock) {
      this.blockRegistry.drawer?.removeBlock(data.drawerBlock)
      data.drawerBlock.remove(this.blockRegistry, this.connectorRegistry)
    }

    setTimeout(() => {
      for (const usage of data.usages) {
        if (usage.removed) continue
        usage.disconnectSelf(null)
        usage.remove(this.blockRegistry, this.connectorRegistry)
      }
      this.requestUpdate()
    }, 0)
  }

  /**
   * Untrack variable uses when the use block is removed from the workspace
   * @param block Variable use block that was just removed from the workspace
   */
  private handleVarBlockRemoved = (block: Block<BlockType.Variable>) => {
    if (block.removed) return
    const data = this.dataByVarName(block.data.name)
    if (!data) {
      console.error("Variable init for removed usage was not registered", block)
      return
    }
    data.usages = data.usages.filter(usage => usage !== block)
  }

  /**
   * Adds a reference to the VariableHelper to newly cloned blocks (when they are dragged from the drawer)
   * This is required to check compatibility of variable types when connecting blocks on the first drag
   * @param block cloned block
   */
  protected onRegisteredClone = (block: AnyBlock) => {
    if (block.type === BlockType.Variable)
      block.updateData(
        data => ({ ...data, variableHelper: new WeakRef(this) }) as BlockDataVariable
      )
  }

  //#region API

  /**
   * Finds a variable by its name
   * @param name variable name
   * @returns variable data or null if not found
   */
  private dataByVarName(
    name: string
  ): TrackedData<Block<BlockType.VarInit, any>, Block<BlockType.Variable>> | null {
    return (
      [...this.tracked.values()].find(data => data.name === name) ??
      [...this.functionPropertyVariables.values()].find(data => data.name === name) ??
      null
    )
  }

  /**
   * Checks if a variable name is available
   * @param name variable name to test
   * @returns true if the name is available, false if it's already registered or invalid
   */
  public isNameAvailable(name: string): boolean {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,30}$/.test(name)) return false
    for (const { name: registeredName } of this.tracked.values())
      if (registeredName === name) return false
    for (const registeredName of this.functionPropertyVariables.keys())
      if (registeredName === name) return false
    return true
  }

  /**
   * Get the next available name for a variable, as a base name with a number suffix
   * @param base base name to start with
   * @returns next available name
   */
  public nextAvailableName(base: string): string {
    let name = base
      .replace(/^[^a-zA-Z]/, "")
      .replaceAll(/[^a-zA-Z0-9]/g, "")
      .substring(0, 30)
      .padStart(1, "v")
    let i = 1
    while (!this.isNameAvailable(name)) {
      name = `${base}${i++}`
    }
    return name
  }

  /**
   * Get a list of all currently registered variables
   * @returns list of variable init data
   */
  public getVariables(): BlockDataVariableInit<any>[] {
    return [...this.tracked.entries(), ...this.functionPropertyVariables.entries()].map(
      ([_initBlock, data]) => ({
        name: data.name,
        type: data.type,
        mutable: data.mutable,
      })
    )
  }

  /**
   * Get the type of a variable by its name
   * @param name variable name
   * @returns variable type or undefined if the variable is not registered
   */
  public getVariableType(name: string): DataType | undefined {
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

  //#region Function Property Variables

  private functionPropertyVariables: Map<
    string,
    {
      name: string
      drawerBlock: Block<BlockType.Variable>
      usages: Block<BlockType.Variable>[]
      type: DataType
      mutable: false
    }
  > = new Map()

  public registerParameter(name: string, type: DataType, mutable: false) {
    if (!this.functionPropertyVariables.has(name)) {
      const drawerBlock = new Block<BlockType.Variable>(
        BlockType.Variable,
        { name },
        DefaultConnectors.byBlockType(BlockType.Variable).map(connector => ({ connector })),
        true,
        this.blockRegistry,
        this.connectorRegistry
      )
      this.blockRegistry.attachToDrawer(drawerBlock, -1)
      this.functionPropertyVariables.set(name, {
        name,
        drawerBlock,
        usages: [drawerBlock],
        type,
        mutable,
      })
    } else {
      console.error("Parameter already registered", name)
    }
  }

  public updateParameterType(name: string, type: DataType) {
    const data = this.functionPropertyVariables.get(name)
    if (data) data.type = type
    else console.error("Parameter not found (update type)", name)
  }

  public updateParameterName(oldName: string, newName: string) {
    const data = this.functionPropertyVariables.get(oldName)
    if (data) {
      data.name = newName
      data.usages.forEach(usage => {
        usage.updateData(data => ({ ...data, name: newName }))
      })
      this.functionPropertyVariables.delete(oldName)
      this.functionPropertyVariables.set(newName, data)
    } else console.error("Parameter not found (update name)", oldName)
  }

  public removeParameter(name: string) {
    const data = this.functionPropertyVariables.get(name)
    if (data) {
      this.remoteUsages(data)
      this.functionPropertyVariables.delete(name)
    } else console.error("Parameter not found (remove)", name)
  }
}
