import type { SandboxCallbacks } from "@kutelabs/client-runner/src"
import type { Block } from "../blocks/Block"
import type { BlockDataExpression } from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import { DefinedExpression } from "../blocks/configuration/DefinedExpression"
import type { RootBlock } from "../blocks/RootBlock"

export type CompilationResult = {
  code: string
  entrypoint: string
  argNames: string[]
}

export abstract class BaseCompiler {
  private readonly addBlockMarkings = true
  private readonly executionDelay = 1000

  compileFromRoot(
    root: RootBlock,
    entrypoint: string,
    callbacks: SandboxCallbacks,
    invisibleCode: Record<string, string>
  ): CompilationResult {
    const functionBlocks = root.blocks.filter(({ block }) => block.type == BlockType.Function)
    let code =
      this.declareEnvironmentFunctions(callbacks) +
      "\n" +
      functionBlocks.map(it => this.compile(it.block)).join("\n") +
      "\n" +
      this.addCode(invisibleCode)
    return { code, entrypoint, argNames: [] }
  }

  compile<T, S>(block: Block<T extends BlockType ? T : never, S> | null): string {
    if (block == null) return ""
    let prefix = ""
    if (![BlockType.Value, BlockType.Variable].includes(block.type)) {
      if (this.addBlockMarkings) prefix += this.callFunction("markBlock", `"${block.id}"`)
      if (this.executionDelay > 0) prefix += this.addDelay(this.executionDelay)
    }
    switch (block.type) {
      case BlockType.Function:
        return this.compileFunction(
          block as Block<BlockType.Function>,
          this.compile.bind(this),
          prefix
        )
      case BlockType.Expression:
        if ((block.data as BlockDataExpression).expression == DefinedExpression.Custom) {
          return (
            prefix +
            this.compileCustomExpression(
              block as Block<BlockType.Expression>,
              this.compile.bind(this)
            )
          )
        } else {
          return (
            prefix +
            this.compileDefinedExpression(
              block as Block<BlockType.Expression>,
              this.compile.bind(this)
            )
          )
        }
      case BlockType.Value:
        return prefix + this.compileValue(block as Block<BlockType.Value>, this.compile.bind(this))
      case BlockType.Variable:
        return (
          prefix + this.compileVariable(block as Block<BlockType.Variable>, this.compile.bind(this))
        )
      case BlockType.VarInit:
        return (
          prefix +
          this.compileVariableInit(block as Block<BlockType.VarInit>, this.compile.bind(this))
        )
      case BlockType.VarSet:
        return (
          prefix +
          this.compileVariableSet(block as Block<BlockType.VarSet>, this.compile.bind(this))
        )
      case BlockType.Loop:
        return prefix + this.compileLoop(block as Block<BlockType.Loop>, this.compile.bind(this))
      case BlockType.Conditional:
        return (
          prefix +
          this.compileConditional(block as Block<BlockType.Conditional>, this.compile.bind(this))
        )
      default:
        throw new Error(`Block type ${block.type} is not implemented in base compiler`)
    }
  }

  abstract declareEnvironmentFunctions(callbacks: SandboxCallbacks): string
  abstract callFunction(name: string, ...args: string[]): string
  abstract addDelay(ms: number): string
  abstract addCode(codeByLang: Record<string, string>): string
  abstract compileFunction(
    block: Block<BlockType.Function>,
    next: typeof this.compile,
    blockMarkings: string
  ): string
  abstract compileDefinedExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string
  abstract compileCustomExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string
  abstract compileValue(block: Block<BlockType.Value>, next: typeof this.compile): string
  abstract compileVariable(block: Block<BlockType.Variable>, next: typeof this.compile): string
  abstract compileVariableInit(block: Block<BlockType.VarInit>, next: typeof this.compile): string
  abstract compileVariableSet(block: Block<BlockType.VarSet>, next: typeof this.compile): string
  abstract compileLoop(block: Block<BlockType.Loop>, next: typeof this.compile): string
  abstract compileConditional(
    block: Block<BlockType.Conditional>,
    next: typeof this.compile
  ): string
}
