import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/configuration/BlockType"
import { DefinedExpression } from "../blocks/configuration/DefinedExpression"
import { ValueDataType } from "../blocks/configuration/ValueDataType"
import { ConnectorRole } from "../connections/ConnectorRole"
import { BaseCompiler } from "./BaseCompiler"

export class JsCompiler extends BaseCompiler {
  compileFunction(block: Block<BlockType.Function>, next: typeof this.compile): string {
    const inner = block.inners.length > 0 ? next(block.inners[0]) : ""
    const ret = block.output ? `\n\treturn ${next(block.output)};` : ""

    return `function ${block.data.name}() {\n\t${inner} ${ret} }` // todo function inputs
    // functions should not have after blocks; thus not compiling them here
  }

  compileDefinedExpression(block: Block<BlockType.Expression>, next: typeof this.compile): string {
    switch (block.data.expression) {
      case DefinedExpression.Println:
        return `console.log(${this.chainInputs(block, next)});\n${next(block.after)}`
      default:
        throw new Error(`Expression ${block.data.expression} is not defined`)
    }
  }

  compileCustomExpression(block: Block<BlockType.Expression>, next: typeof this.compile): string {
    return `${block.data.customExpression?.get?.("js") ?? ""}\n${next(block.after)}`
  }

  compileValue<S extends ValueDataType>(
    block: Block<BlockType.Value, S>,
    _next: typeof this.compile
  ): string {
    if ("value" in block.data) {
      switch (block.data.type) {
        case ValueDataType.Int:
        case ValueDataType.Float:
          return Number(block.data.value).toString()
        case ValueDataType.String:
          return `"${block.data.value}"`
        case ValueDataType.Boolean:
          return block.data.value == true ? "true" : "false"
        case ValueDataType.IntArray:
        case ValueDataType.FloatArray:
          return `[${(block.data.value as number[]).map(it => Number(it)).join(", ")}]`
        case ValueDataType.StringArray:
          return `["${(block.data.value as string[]).join('", "')}"]`
        case ValueDataType.BooleanArray:
          return `[${(block.data.value as boolean[]).map(it => (it == true ? "true" : "false")).join(", ")}]`
        default:
          throw new Error(`Value type ${block.data.type} can't be compiled`)
      }
    } else return ""
    // value blocks are always leafs, thus not compiling connected blocks
  }

  compileVariable(block: Block<BlockType.Variable>, _next: typeof this.compile): string {
    return block.data.name
    // variable blocks are always leafs, thus not compiling connected blocks
  }

  compileVariableInit(block: Block<BlockType.VarInit>, next: typeof this.compile): string {
    return `${block.data.mutable ? "let" : "const"} ${block.data.name} = ${next(block.inputs[0])};\n${next(block.after)}`
  }

  compileVariableSet(block: Block<BlockType.VarSet>, next: typeof this.compile): string {
    return `${next(block.inners[0])} = ${next(block.inputs[0])};\n${next(block.after)}`
  }

  compileLoop(block: Block<BlockType.Loop>, next: typeof this.compile): string {
    return `while (${next(block.conditional)}) {
      ${next(block.inners[0])}
    }`
  }

  compileConditional(block: Block<BlockType.Conditional>, next: typeof this.compile): string {
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

    if (elseBlock) compiled += ` else {\n${next(elseBlock)}\n}`

    return compiled + `\n${next(block.after)}`
  }

  chainInputs(block: Block<BlockType>, next: typeof this.compile): string {
    return block.inputs.map(it => next(it)).join(", ")
  }
}
