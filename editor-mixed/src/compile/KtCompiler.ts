import type { SandboxCallbacks } from "@kutelabs/client-runner/src"
import type { AnyBlock, Block } from "../blocks/Block"
import { LogicJunctionMode } from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import { DataType } from "../blocks/configuration/DataType"
import { DefinedExpressionData } from "../blocks/configuration/DefinedExpression"
import { ConnectorRole } from "../connections/ConnectorRole"
import { BaseCompiler, type InternalCompilationProps } from "./BaseCompiler"
import { IdGenerator } from "@kutelabs/shared/src"

export class KtCompiler extends BaseCompiler {
  protected override compileByBlockType(
    block: Block<BlockType>,
    propsMaybe?: InternalCompilationProps
  ): string {
    const loadedBlockIds = Object.keys(propsMaybe?.loadedBlocks ?? {})
    const firstFunctionInvoke = block.inputs.find(
      it => it?.type == BlockType.FunctionInvoke && !loadedBlockIds.includes(it.id)
    )
    if (firstFunctionInvoke) {
      const props = propsMaybe ?? {}
      const compileNext = (block: Block<BlockType>, newProps?: InternalCompilationProps) =>
        this.compile(block, newProps ?? props)
      return this.handleNextFunctionInvokeInput(
        firstFunctionInvoke as Block<BlockType.FunctionInvoke>,
        block,
        compileNext.bind(this),
        props
      )
    }

    return super.compileByBlockType(block, propsMaybe)
  }

  private handleNextFunctionInvokeInput(
    invokeBlock: Block<BlockType.FunctionInvoke>,
    originalBlock: AnyBlock,
    next: typeof this.compile,
    props: InternalCompilationProps
  ): string {
    const valueName = "_" + IdGenerator.next.replace(/-/g, "")
    if (!props.loadedBlocks) props.loadedBlocks = {}
    props.loadedBlocks[invokeBlock.id] = valueName
    return `${invokeBlock.data.name}(${[...invokeBlock.inputs.map(it => next(it))].join(", ")}).then { ${valueName} ->\n${next(originalBlock)}\n};`
  }

  declareImports(callbacks: SandboxCallbacks): string {
    const imports = ["import kotlin.js.Promise"]
    const requestWait = '@JsName("requestWait")\nexternal fun requestWait(): Promise<Unit>'
    const envFunctions = Object.entries(callbacks.flattenedCallbacks())
      .filter(([name]) => !name.startsWith("console."))
      .map(([name]) => `@JsName("${name}")\nexternal fun ${name}(vararg args: Any)`)
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
    const inputs = block.data.params.map(it => it.name + ": dynamic").join(", ")
    let inner = block.inners.length > 0 ? next(block.inners[0], props) : ""
    if (!inner) {
      inner = props.resolveFunction ?? ""
      delete props.resolveFunction
    }

    let returnType = "Unit"
    if (block.output && block.output.data) {
      if (
        [BlockType.LogicComparison, BlockType.LogicJunction, BlockType.LogicNot].includes(
          block.output.type
        )
      )
        returnType = "Boolean"
      else if ("type" in block.output.data)
        returnType = this.blockDataTypeToKtType(block.output.data.type)
      else if ("variableHelper" in block.output.data)
        returnType = this.blockDataTypeToKtType(
          block.output.data.variableHelper!.deref()!.getVariableType(block.output.data.name)!
        )
    }

    return `@JsExport
    fun ${block.data.name}(${inputs}): Promise<${returnType}> = Promise { resolve, _reject ->
    ${this.markBlock(block.id)}\
    ${this.wrapDelay(inner)}
    //fnend_${block.data.name}
    }`
    // functions should not have after blocks; thus not compiling them here
  }

  private blockDataTypeToKtType(type: DataType): string {
    switch (type) {
      case DataType.Int:
        return "Int"
      case DataType.Float:
        return "Double"
      case DataType.String:
        return "String"
      case DataType.Boolean:
        return "Boolean"
      case DataType.IntArray:
        return "List<Int>"
      case DataType.FloatArray:
        return "List<Double>"
      case DataType.StringArray:
        return "List<String>"
      case DataType.BooleanArray:
        return "List<Boolean>"
      default:
        return "dynamic"
    }
  }

  compileFunctionInvoke(
    block: Block<BlockType.FunctionInvoke>,
    _next: typeof this.compile,
    props: InternalCompilationProps
  ): string {
    if (!props.loadedBlocks || !Object.keys(props.loadedBlocks).includes(block.id))
      throw new Error("FunctionInvoke blocks must be compiled before the block using the result")
    // fixme this will break with chained inputs; as inputs also cannot use .then
    return `${props.loadedBlocks[block.id]}`
  }

  compileDefinedExpression(block: Block<BlockType.Expression>, next: typeof this.compile): string {
    const definedMethod = DefinedExpressionData[block.data.expression].kt
    if (!definedMethod) throw new Error(`Expression ${block.data.expression} is not defined`)

    return (
      definedMethod.replace(/{{\d}}/g, (match: string) => {
        // matches placeholders like "{{0}}"
        const index = Number(match[2])
        return next(block.inputs[index])
      }) + `;\n${next(block.after)}`
    )
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
        case DataType.Dynamic:
          return block.data.value.toString()
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
    const compiled = compile(currentBlock, props)
    if (!props) return compiled

    // consume return block on last block inside a function
    // this is required because the return must be nested within the .then calls of the requestWait functions
    if (props.resolveFunction && currentBlock.after == null) {
      const resolve = props.resolveFunction
      delete props.resolveFunction
      return compiled + resolve
    }
    return compiled
  }
}
