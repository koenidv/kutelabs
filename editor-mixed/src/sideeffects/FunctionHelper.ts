import { Block, type AnyBlock } from "../blocks/Block"
import type {
  BlockDataFunction,
  BlockDataFunctionReference,
} from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import { DataType } from "../blocks/configuration/DataType"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRInterface } from "../registries/ConnectorRInterface"
import { BaseSideEffect, type TrackedData } from "./BaseSideEffect"
import type { FunctionHInterface } from "./FunctionHInterface"
import type { VariableHInterface } from "./VariableHInterface"

/**
 * side effect / helper class
 * This helper tracks init blocks in the workspace to provide information about available functions
 * It adds function invocation blocks to the drawer for available functions and removes invocations when the function block is removed
 * Until scoped funs are implemented, functions are global
 */
export class FunctionHelper
  extends BaseSideEffect<Block<BlockType.Function>, Block<BlockType.FunctionInvoke>>
  implements FunctionHInterface
{
  private _entrypointName: string = "main"
  set entrypoint(name: string) {
    this._entrypointName = name
  }

  private variableHelper: VariableHInterface

  constructor(
    blockRegistry: BlockRInterface,
    connectorRegistry: ConnectorRInterface,
    requestUpdate: () => void,
    variableHelper: VariableHInterface
  ) {
    super(blockRegistry, connectorRegistry, requestUpdate)
    this.variableHelper = variableHelper
  }

  protected onBlockAddedToWorkspace = (block: AnyBlock) => {
    if (block.type === BlockType.Function)
      return this.handleFunctionAdded(block as Block<BlockType.Function>)
    if (block.type === BlockType.FunctionInvoke)
      return this.handleInvocationAdded(block as Block<BlockType.FunctionInvoke>)
  }

  /**
   * When a function block is added to the workspace, this
   * a) starts listening for data changes
   * b) adds a function invokation block to the drawer
   * c) tracks the function for later use
   * d) applies any pending function uses for this function
   * e) applies the next available function name if the name is already taken
   * side effect: requests a render update
   * @param block Function block that was just added to the workspace
   */
  private handleFunctionAdded = (block: Block<BlockType.Function>) => {
    if (this.tracked.has(block)) {
      console.error("Added var init block to workspace but block is already tracked:", block)
      return
    }

    const data = block.data
    if (!this.isNameAvailable(data.name)) {
      data.name = this.nextAvailableName(data.name)
      block.data = data
    }

    if (block.data.name !== this._entrypointName) {
      const drawerBlock = new Block<BlockType.FunctionInvoke>(
        BlockType.FunctionInvoke,
        { type: DataType.FunctionInvokation, name: data.name },
        DefaultConnectors.byBlockType(BlockType.FunctionInvoke).map(connector => ({ connector })),
        true,
        this.blockRegistry,
        this.connectorRegistry
      )
      if (this._entrypointName !== block.data.name)
        this.blockRegistry.attachToDrawer(drawerBlock, -1)

      this.tracked.set(block as Block<BlockType.Function>, {
        name: data.name,
        params: data.params,
        usages: [drawerBlock],
        drawerBlock,
      })
    } else {
      block.updateData(data => ({ ...data, isMain: true }))
      this.tracked.set(block as Block<BlockType.Function>, {
        name: data.name,
        params: data.params,
        usages: [],
      })
    }

    const matchingPendingUsages = this.pendingUsages.filter(
      usage => usage.data.name === block.data.name
    )
    if (matchingPendingUsages.length > 0) {
      this.pendingUsages = this.pendingUsages.filter(usage => usage.data.name !== block.data.name)
      if (this.pendingUsages.length == 0)
        console.info("✓ All pending function usages were resolved")
    }
    matchingPendingUsages.forEach(usage => this.handleInvocationAdded(usage), this)

    // register existing parameters
    block.data.params.forEach(param => {
      this.variableHelper.registerParameter(param.name, param.type, false)
      param.registeredName = param.name
    }, this)

    block.on("dataChanged", this.handleBlockDataChanged.bind(this))

    this.requestUpdate()
  }

  /**
   * Propagate changes in function to function invocation blocks
   * @param changedBlock Function block that was changed
   */
  private handleBlockDataChanged = (changedBlock: Block<BlockType.Function>) => {
    const currentData = this.tracked.get(changedBlock)
    console.log("Function data changed", changedBlock.data, currentData?.name)
    if (!currentData) return

    let requestUpdate = false

    if (currentData.name !== changedBlock.data.name) {
      const newName = changedBlock.data.name.replaceAll(/[^a-zA-Z0-9]/g, "_")
      if (this.isNameAvailable(newName)) {
        currentData.name = newName
        currentData.usages.forEach(usage => {
          usage.updateData(data => ({ ...data, name: newName }))
        })
      } else {
        changedBlock.updateData(data => ({ ...data, name: currentData.name }))
      }
    }

    // diff removed
    currentData.params.forEach(param => {
      if (!changedBlock.data.params.find(p => p.registeredName === param.name)) {
        this.variableHelper.removeParameter(param.name)
        requestUpdate = true
      }
    }, this)

    changedBlock.data.params.forEach(param => {
      if (!param.registeredName) {
        // diff added
        const name = this.variableHelper.nextAvailableName(param.name ? param.name : "arg")
        this.variableHelper.registerParameter(name, param.type, false)
        param.name = name
        param.registeredName = name
        requestUpdate = true
      } else if (param.registeredName !== param.name) {
        // diff renamed
        this.variableHelper.updateParameterName(param.registeredName, param.name)
        param.registeredName = param.name
        requestUpdate = true
      }
      if (param.type !== this.variableHelper.getVariableType(param.name)) {
        // diff type changed
        this.variableHelper.updateParameterType(param.name, param.type)
        requestUpdate = true
      }
    }, this)

    if (requestUpdate) this.requestUpdate()
  }
  /**
   * When a function invokation or reference is added to the workspace, this tracks the usage
   * This is required to remove the usage when the function is removed
   * @param block Function invokation that was just added to the workspace
   */
  private handleInvocationAdded = (block: Block<BlockType.FunctionInvoke>) => {
    const data = this.dataByName(block.data.name)
    if (!data) {
      if (window.location.hostname == "localhost" || window.location.hostname.includes("main"))
        console.info(
          `Function '${block.data.name}' used but not yet initialized. This should only happen during block loading. block id`,
          block.id
        )
      this.pendingUsages.push(block)
      return
    }
    data.usages.push(block)
    block.updateData(data => ({ ...data, functionHelper: new WeakRef(this) }))
  }

  protected onBlockRemovedFromWorkspace = (block: AnyBlock) => {
    if (block.type === BlockType.Function)
      return this.handleFunctionRemoved(block as Block<BlockType.Function>)
    if (block.type === BlockType.FunctionInvoke)
      return this.handleInvocationRemoved(block as Block<BlockType.FunctionInvoke>)
  }

  /**
   * When a function block is removed from the workspace,
   * remove all uses of the function and drawer block from the drawer.
   * // todo remove function invocation inputs before removing the invocation
   * @param block VarInit block that was just removed from the workspace
   */
  private handleFunctionRemoved = (block: Block<BlockType.Function>) => {
    if (this.tracked.has(block as Block<BlockType.Function>)) {
      // remove drawer block
      const data = this.tracked.get(block as Block<BlockType.Function>)!
      if (data.drawerBlock) {
        this.blockRegistry.drawer?.removeBlock(data.drawerBlock)
        data.drawerBlock.remove(this.blockRegistry, this.connectorRegistry)
      }

      // remove invocations after drawer deduplicated them
      setTimeout(() => {
        for (const usage of data.usages) {
          if (usage.removed) continue
          usage.disconnectSelf(null)
          usage.remove(this.blockRegistry, this.connectorRegistry)
        }
        this.requestUpdate()
      }, 0)

      block.off("dataChanged", this.handleBlockDataChanged.bind(this))

      this.tracked.delete(block as Block<BlockType.Function>)
    }
  }

  /**
   * Untrack invocations when the use block is removed from the workspace
   * @param block Function invocation that was just removed from the workspace
   */
  private handleInvocationRemoved = (block: Block<BlockType.FunctionInvoke>) => {
    if (block.removed) return
    const data = this.dataByName(block.data.name)
    if (!data) {
      console.error("Function for removed invocation was not registered", block)
      return
    }
    data.usages = data.usages.filter(usage => usage !== block)
  }

  /**
   * Adds a reference to the FunctionHelper to newly cloned blocks (when they are dragged from the drawer)
   * This is required to check compatibility of invocations types when connecting blocks on the first drag
   * @param block cloned block
   */
  protected onRegisteredClone = (block: AnyBlock) => {
    if (block.type === BlockType.FunctionInvoke)
      block.updateData(
        data => ({ ...data, functionHelper: new WeakRef(this) }) as BlockDataFunctionReference
      )
  }

  /**
   * Finds a function by its name
   * @param name function name
   * @returns function data or null if not found
   */
  private dataByName(
    name: string
  ): TrackedData<Block<BlockType.Function>, Block<BlockType.FunctionInvoke>> | null {
    return [...this.tracked.values()].find(data => data.name === name) ?? null
  }

  /**
   * Checks if a function name is available
   * @param name function name to test
   * @returns true if the name is available, false if it's already registered or invalid
   */
  public isNameAvailable(name: string): boolean {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,30}$/.test(name)) return false
    for (const { name: registeredName } of this.tracked.values())
      if (registeredName === name) return false
    return true
  }

  /**
   * Get the next available name for a function, as a base name with a number suffix
   * @param base base name to start with
   * @returns next available name
   */
  public nextAvailableName(base: string): string {
    let name = base
      .replace(/^[^a-zA-Z]/, "")
      .replaceAll(/[^a-zA-Z0-9]/g, "")
      .substring(0, 30)
      .padStart(1, "f")
    let i = 1
    while (!this.isNameAvailable(name)) {
      name = `${base}${i++}`
    }
    return name
  }

  /**
   * Get the function parameters by its name
   * @param name function name
   * @returns function parameters or undefined if the function is not registered
   */
  public getParams(name: string): BlockDataFunction["params"] | undefined {
    return this.dataByName(name)?.params
  }

  /**
   * Get the return type of a function by its name
   * @param name function name
   * @returns function return type or undefined if the function is not registered
   */
  public getReturnType(name: string): DataType | undefined {
    // todo not yet implemented
    return undefined
  }

  /**
   * Get a list of all currently registered functions
   * @returns list of function data
   */
  public getFunctions(): BlockDataFunction[] {
    return [...this.tracked.entries()].map(([_initBlock, data]) => ({
      name: data.name,
      params: data.params,
    }))
  }
}
