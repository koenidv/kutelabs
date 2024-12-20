import type { AnyBlock, Block } from "../blocks/Block"
import { BlockType } from "../blocks/configuration/BlockType"
import type { ValueDataType } from "../blocks/configuration/ValueDataType"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { VariableMeta, VariableHInterface } from "./VariableHInterface"

type VariableData = VariableMeta & { usages: Block<BlockType.Variable>[] }

/**
 * side effect / helper class
 * This helper tracks init blocks in the workspace to provide information about available variables
 * It adds variable blocks to the drawer for available variables and removes variable usages when the init block is removed
 * Variables reported here are not necessarily available in a given scope, they're just declared somewhere in the workspaces
 */
export class VariableHelper implements VariableHInterface {
  private variables = new Map<Block<BlockType.VarInit>, VariableData>()

  constructor(blockRegistry: BlockRInterface) {
    blockRegistry.on("workspaceAdded", ({ block }) => this.onBlockAddedToWorkspace(block))
    blockRegistry.on("workspaceRemoved", ({ block }) => this.onBlockRemovedFromWorkspace(block))
  }

  private onBlockAddedToWorkspace = (block: AnyBlock) => {
    if (block.type !== BlockType.VarInit) return
    if (this.variables.has(block as Block<BlockType.VarInit>)) {
      console.warn("Added var init block to workspace but block is already tracked:", block)
      return
    }
    const varblock = block as Block<BlockType.VarInit>

    this.variables.set(block as Block<BlockType.VarInit>, {
      name: varblock.data.name,
      type: varblock.data.type,
      isMutable: varblock.data.isMutable,
      usages: [],
    })
    console.log("added variable init to workspace", block)
  }

  private onBlockRemovedFromWorkspace = (block: AnyBlock) => {
    if (block.type !== BlockType.VarInit) return
    if (this.variables.has(block as Block<BlockType.VarInit>)) {
      this.variables.delete(block as Block<BlockType.VarInit>)
      console.log("deleted variable associated with", block)
    }
  }

  public isNameAvailable(name: string): boolean {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return false
    for (const { name: registeredName } of this.variables.values())
      if (registeredName === name) return false
    return true
  }

  public getVariables(): { name: string; type: ValueDataType; isMutable: boolean }[] {
    return [...this.variables.entries()].map(([_initBlock, data]) => ({
      name: data.name,
      type: data.type,
      isMutable: data.isMutable,
    }))
  }
}
