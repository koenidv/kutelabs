import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/configuration/BlockType"
import { DefinedExpression } from "../blocks/configuration/DefinedExpression"
import { ValueDataType } from "../blocks/configuration/ValueDataType"
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

    return `function ${block.data.name}() {\n\t${inner}}`
    // functions should not have after blocks; thus not compiling them here
  }

  compileDefinedExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string {
    switch (block.data.expression) {
      case DefinedExpression.Println:
        return `console.log(${this.chainInputs(block, next)});\n${next(block.after)}`
      default:
        throw new Error(`Expression ${block.data.expression} is not defined`)
    }
  }

  compileCustomExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string {
    return `${block.data.customExpression?.get("js") ?? ""}\n${next(block.after)}`
  }

  compileValue<S extends ValueDataType>(
    block: Block<BlockType.Value, S>,
    _next: typeof this.compile
  ): string {
    if ("value" in block.data) {
      switch (block.data.type) {
        case ValueDataType.Int:
          return Number(block.data.value).toString()
        case ValueDataType.String:
          return `"${block.data.value}"`
        default:
          throw new Error(`Value type ${block.data.type} can't be compiled`)
      }
    } else return ""
    // value blocks are always leafs, thus not compiling connected blocks
  }

  compileVariable(
    block: Block<BlockType.Variable>,
    _next: typeof this.compile
  ): string {
    return block.data.name
    // variable blocks are always leafs, thus not compiling connected blocks
  }

  compileLoop(block: Block<BlockType.Loop>, next: typeof this.compile): string {
    return `while (${next(block.conditional)}) {
      ${next(block.inners[0])}
    }`
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

  chainInputs(block: Block<BlockType>, next: typeof this.compile): string {
    return block.inputs.map(it => next(it)).join(", ")
  }
}
