import type { AnyBlock } from "../blocks/Block"
import type { ValueDataType } from "../blocks/configuration/ValueDataType"
import type { BlockRegistry } from "./BlockRegistry"
import type { VariableRInterface } from "./VariableRInterface"

export class VariableRegistry implements VariableRInterface {
  private variables = new Map<string, ValueDataType>()

  constructor(blockRegistry: BlockRegistry) {
    blockRegistry.on("workspaceAdded", ({ block }) => this.onBlockAddedToWorkspace(block))
    blockRegistry.on("workspaceRemoved", ({ block }) => this.onBlockRemovedFromWorkspace(block))
  }

  private onBlockAddedToWorkspace = (block: AnyBlock) => {}

  private onBlockRemovedFromWorkspace = (block: AnyBlock) => {}

  public isNameAvailable(name: string): boolean {
    return !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && !this.variables.has(name)
  }

  public getVariables(): { name: string; type: ValueDataType }[] {
    return [...this.variables.entries()].map(([name, type]) => ({ name, type }))
  }

  public getVariableType(name: string): ValueDataType | null {
    return this.variables.get(name) ?? null
  }
}
