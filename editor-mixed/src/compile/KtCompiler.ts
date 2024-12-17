import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/configuration/BlockType"
import { DefinedExpression } from "../blocks/configuration/DefinedExpression"
import { ValueDataType } from "../blocks/configuration/ValueDataType"
import { ConnectorRole } from "../connections/ConnectorRole"
import { BaseCompiler } from "./BaseCompiler"

export class KtCompiler extends BaseCompiler {
  compileFunction(
    block: Block<BlockType.Function>,
    next: typeof this.compile
  ): string {
    const inner = block.inners.length > 0 ? next(block.inners[0]) : ""
    const ret = block.output ? `\n\treturn ${next(block.output)};` : ""

    return `function ${block.data.name}() {\n\t${inner} ${ret} }` // todo function inputs
    // functions should not have after blocks; thus not compiling them here
  }

  compileDefinedExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string {
    switch (block.data.expression) {
      case DefinedExpression.Println:
        return `println(${this.chainToStringTemplate(block, next)});\n${next(block.after)}`
      default:
        throw new Error(`Expression ${block.data.expression} is not defined`)
    }
  }

  compileCustomExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string {
    return `${block.data.customExpression?.get?.("kt") ?? ""}\n${next(block.after)}`
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
        case ValueDataType.Boolean:
          return block.data.value == true ? "true" : "false"
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
    const ifBlock = block.connectedBlocks.byConnector(
      block.connectors.byRole(ConnectorRole.If_True)[0]
    )
    const elseBlock = block.connectedBlocks.byConnector(
      block.connectors.byRole(ConnectorRole.If_False)[0]
    )

    let compiled = `
    if (${next(block.conditional)}) {
      ${next(ifBlock)}
    }`

    if (elseBlock)
      compiled += ` else {\n${next(elseBlock)}\n}`

    return compiled + `\n${next(block.after)}`
  }

  mainCall(): string {
    return ""
    // main call will be added by the transpiler
  }

  chainInputs(block: Block<BlockType>, next: typeof this.compile): string {
    return block.inputs.map(it => next(it)).join(", ")
  }

  /**
   * Chains multiple input variables into a string using template literals
   * This is useful for methods like println that only take one argument in Kotlin, but multiple in Js
   * @param block parent block for the inputs
   * @param next function to compile the input blocks
   * @returns string template with the inputs
   */
  chainToStringTemplate(block: Block<BlockType>, next: typeof this.compile): string {
    return "\"" + block.inputs.map(it => "\${" + next(it) + "}").join(", ") + "\""
  }
}
