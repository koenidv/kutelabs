import type { SandboxCallbacks } from "@kutelabs/client-runner/src"
import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/configuration/BlockType"
import { DataType } from "../blocks/configuration/DataType"
import { DefinedExpression } from "../blocks/configuration/DefinedExpression"
import { ConnectorRole } from "../connections/ConnectorRole"
import { BaseCompiler, type InternalCompilationProps } from "./BaseCompiler"

export class KtCompiler extends BaseCompiler {
  declareImports(callbacks: SandboxCallbacks): string {
    const imports = ["import kotlin.js.Promise"]
    const requestWait = '@JsName("requestWait")\nexternal fun requestWait(): Promise<Unit>'
    const envFunctions = [...callbacks.callbacks.keys()].map(
      name => `@JsName("${name}")\nexternal fun ${name}(vararg args: Any)`
    )
    return [...imports, requestWait, ...envFunctions].join("\n")
  }

  callFunction(name: string, ...args: string[]): string {
    return `${name}(${args.join(", ")});\n`
  }

  wrapDelay(code: string): string {
    return `requestWait().then { ${code} };\n`
  }

  addCode(codeByLang: Record<string, string>): string {
    return codeByLang["kt"] ?? ""
  }

  compileFunction(
    block: Block<BlockType.Function>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string {
    props = {
      ...props,
      resolveFunction:
        block.output?.let(it => this.markBlock(it.id) + this.wrapDelay(`resolve(${next(it)});`)) ??
        "resolve(Unit);",
    }
    const inner = block.inners.length > 0 ? next(block.inners[0], props) : ""

    return `@JsExport
    @kotlin.js.ExperimentalJsExport
    fun ${block.data.name}(): Promise<dynamic> = Promise { resolve, _reject ->
    ${this.markBlock(block.id)}\
    ${this.wrapDelay(inner)}
    }` // todo function inputs
    // functions should not have after blocks; thus not compiling them here
  }

  compileDefinedExpression(block: Block<BlockType.Expression>, next: typeof this.compile): string {
    switch (block.data.expression) {
      case DefinedExpression.Println:
        return `println(${this.chainToStringTemplate(block, next)});\n${next(block.after)}`
      default:
        throw new Error(`Expression ${block.data.expression} is not defined`)
    }
  }

  compileCustomExpression(block: Block<BlockType.Expression>, next: typeof this.compile): string {
    return `${block.data.customExpression?.get?.("kt") ?? ""}\n${next(block.after)}`
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
          return `listOf(${(block.data.value as number[]).map(it => Number(it)).join(", ")})`
        case DataType.StringArray:
          return `listOf("${(block.data.value as string[]).join('", "')}")`
        case DataType.BooleanArray:
          return `listOf(${(block.data.value as boolean[]).map(it => (it == true ? "true" : "false")).join(", ")})`
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
    return `${block.data.mutable ? "var" : "val"} ${block.data.name} = ${next(block.inputs[0])};\n${next(block.after)}`
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
  private chainToStringTemplate(block: Block<BlockType>, next: typeof this.compile): string {
    return '"' + block.inputs.map(it => "\${" + next(it) + "}").join(", ") + '"'
  }

  handleProps(
    props: InternalCompilationProps | undefined,
    currentBlock: Block<BlockType>,
    compile: (block: Block<BlockType>, newProps?: InternalCompilationProps) => string
  ): string {
    if (!props) return compile(currentBlock)

    // consume return block on last block inside a function
    // this is required because the return must be nested within the .then calls of the requestWait functions
    if (props.resolveFunction && currentBlock.after == null) {
      const resolve = props.resolveFunction
      delete props.resolveFunction
      return compile(currentBlock, props) + resolve
    }
    return compile(currentBlock, props)
  }
}
