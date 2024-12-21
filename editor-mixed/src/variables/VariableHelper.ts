import { Block, type AnyBlock } from "../blocks/Block"
import { BlockType } from "../blocks/configuration/BlockType"
import type { ValueDataType } from "../blocks/configuration/ValueDataType"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRInterface } from "../registries/ConnectorRInterface"
import type { VariableMeta, VariableHInterface } from "./VariableHInterface"

type VariableData = VariableMeta & { drawerBlock: AnyBlock; usages: Block<BlockType.Variable>[] }

/**
 * side effect / helper class
 * This helper tracks init blocks in the workspace to provide information about available variables
 * It adds variable blocks to the drawer for available variables and removes variable usages when the init block is removed
 * Variables reported here are not necessarily available in a given scope, they're just declared somewhere in the workspaces
 */
export class VariableHelper implements VariableHInterface {
  private variables = new Map<Block<BlockType.VarInit>, VariableData>()

  private readonly blockRegistry: BlockRInterface
  private readonly connectorRegistry: ConnectorRInterface
  private readonly requestUpdate: () => void


  constructor(blockRegistry: BlockRInterface, connectorRegistry: ConnectorRInterface, requestUpdate: () => void) {
    blockRegistry.on("workspaceAdded", ({ block }) => this.onBlockAddedToWorkspace(block))
    blockRegistry.on("workspaceRemoved", ({ block }) => this.onBlockRemovedFromWorkspace(block))
    this.blockRegistry = blockRegistry
    this.connectorRegistry = connectorRegistry
    this.requestUpdate = requestUpdate
  }

  private onBlockAddedToWorkspace = (block: AnyBlock) => {
    if (block.type !== BlockType.VarInit) return
    if (this.variables.has(block as Block<BlockType.VarInit>)) {
      console.warn("Added var init block to workspace but block is already tracked:", block)
      return
    }
    const varblock = block as Block<BlockType.VarInit>
    
    const drawerBlock = new Block<BlockType.Variable>(
      BlockType.Variable,
      {
        name: varblock.data.name,
        type: varblock.data.type,
        isMutable: varblock.data.isMutable,
      },
      DefaultConnectors.byBlockType(BlockType.Variable).map(connector => ({ connector })),
      true,
      this.blockRegistry,
      this.connectorRegistry
    )
    this.blockRegistry.attachToDrawer(drawerBlock, -1)

    this.variables.set(block as Block<BlockType.VarInit>, {
      name: varblock.data.name,
      type: varblock.data.type,
      isMutable: varblock.data.isMutable,
      usages: [],
      drawerBlock,
    })

    this.requestUpdate()
  }

  private onBlockRemovedFromWorkspace = (block: AnyBlock) => {
    if (block.type !== BlockType.VarInit) return
    if (this.variables.has(block as Block<BlockType.VarInit>)) {

      // remove drawer block
      const data = this.variables.get(block as Block<BlockType.VarInit>)!
      this.blockRegistry.drawer?.removeBlock(data.drawerBlock)
      this.blockRegistry.deregister(data.drawerBlock, this.connectorRegistry)

      this.variables.delete(block as Block<BlockType.VarInit>)
      this.requestUpdate()
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
