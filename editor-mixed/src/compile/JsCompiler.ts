import type { Block } from "../blocks/Block"
import { LogicJunctionMode } from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import { DataType } from "../blocks/configuration/DataType"
import { DefinedExpressionData } from "../blocks/configuration/DefinedExpression"
import { ConnectorRole } from "../connections/ConnectorRole"
import { BaseCompiler, type InternalCompilationProps } from "./BaseCompiler"

export class JsCompiler extends BaseCompiler {
  declareImports(): string {
    return ""
  }

  callFunction(name: string, ...args: string[]): string {
    return `${name}(${args.join(", ")});\n`
  }

  wrapDelay(code: string): string {
    return `await requestWait();\n${code}`
  }

  addCode(codeByLang: Record<string, string>): string {
    return codeByLang["js"] ?? ""
  }

  compileFunction(block: Block<BlockType.Function>, next: typeof this.compile): string {
    const inner = block.inners.length > 0 ? next(block.inners[0]) : ""
    let ret = ""
    if (block.output) {
      if (this.addBlockMarkings) ret += this.callFunction("markBlock", `"${block.output.id}"`)
      ret += this.wrapDelay(`return ${next(block.output)};`)
    }

    return `async function ${block.data.name}() {\n${this.markBlock(block.id)}\n${this.wrapDelay(inner + "\n" + ret)} }` // todo function inputs
    // functions should not have after blocks; thus not compiling them here
  }

  compileDefinedExpression(block: Block<BlockType.Expression>, next: typeof this.compile): string {
    const definedMethod = DefinedExpressionData[block.data.expression].js
    if (!definedMethod) throw new Error(`Expression ${block.data.expression} is not defined`)

    return definedMethod.replace(/{{\d}}/g, (match: string) => {
      // matches placeholders like "{{0}}"
      const index = Number(match[2])
      return next(block.inputs[index])
    })
  }

  compileCustomExpression(block: Block<BlockType.Expression>, next: typeof this.compile): string {
    return `${block.data.customExpression?.get?.("js") ?? ""}\n${next(block.after)}`
  }

  compileValue<S extends DataType>(
    block: Block<BlockType.Value, S>,
    _next: typeof this.compile
  ): string {
    if ("value" in block.data) {
      switch (block.data.type) {
        case DataType.Int:
        case DataType.Float:
          return Number(block.data.value).toString()
        case DataType.String:
          return `"${block.data.value}"`
        case DataType.Boolean:
          return block.data.value == true ? "true" : "false"
        case DataType.IntArray:
        case DataType.FloatArray:
          return `[${(block.data.value as number[]).map(it => Number(it)).join(", ")}]`
        case DataType.StringArray:
          return `["${(block.data.value as string[]).join('", "')}"]`
        case DataType.BooleanArray:
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
    ${this.markBlock(block.id)}
    ${this.wrapDelay(next(block.inners[0]))}
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

  compileLogicNot(block: Block<BlockType.LogicNot>, next: typeof this.compile): string {
    return `!(${next(block.conditional)})`
  }

  compileLogicJunction(block: Block<BlockType.LogicJunction>, next: typeof this.compile): string {
    const operator = block.data.mode == LogicJunctionMode.And ? "&&" : "||"
    const inputs = block.inputs.map(it => (it == null ? "false" : next(it))).join(` ${operator} `)
    return `(${inputs})`
  }

  compileLogicComparison(
    block: Block<BlockType.LogicComparison>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string {
    const operator = block.data.mode
    const left = block.inputs[0] ? next(block.inputs[0]) : "false"
    const right = block.inputs[1] ? next(block.inputs[1]) : "false"
    return `(${left} ${operator} ${right})`
  }

  chainInputs(block: Block<BlockType>, next: typeof this.compile): string {
    return block.inputs.map(it => next(it)).join(", ")
  }

  handleProps(
    _props: InternalCompilationProps | undefined,
    currentBlock: Block<BlockType>,
    compile: typeof this.compile
  ): string {
    return compile(currentBlock)
  }
}
