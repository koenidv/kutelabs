import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/BlockType"
import { ConnectorRole } from "../connections/ConnectorRole"
import { BaseCompiler } from "./BaseCompiler"

export class JsCompiler extends BaseCompiler {
  compileFunction(
    block: Block<BlockType.Function>,
    next: typeof this.compile
  ): string {
    const inner = block.inners.length > 0 ? next(block.inners[0]) : ""

    let ret = ""
    const outputConnectors = block.connectors.byRole(ConnectorRole.Output)
    if (outputConnectors.length > 0) {
      const firstOutputBlock = block.connectedBlocks.byConnector(
        outputConnectors[0]
      )
      if (firstOutputBlock == null) ret += "return;"
      else ret += `return ${next(firstOutputBlock)};`
    }

    return `
      function ${block.data.name}() {
        ${inner}
      } 
    `
    // functions should not have after blocks; thus not compiling them here
  }

  compileExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string {
    throw new Error("Method not implemented.")
  }

  compileValue(
    block: Block<BlockType.Value>,
    next: typeof this.compile
  ): string {
    throw new Error("Method not implemented.")
  }

  compileVariable(block: Block<BlockType.Variable>, next: typeof this.compile): string {
    throw new Error("Method not implemented.")
  }

  compileLoop(block: Block<BlockType.Loop>, next: typeof this.compile): string {
    throw new Error("Method not implemented.")
  }

  compileConditional(
    block: Block<BlockType.Conditional>,
    next: typeof this.compile
  ): string {
    throw new Error("Method not implemented.")
  }

  mainCall(): string {
    return "main();"
  }
}
