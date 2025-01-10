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

export type InternalCompilationProps = {
  resolveFunction?: string
}

export abstract class BaseCompiler {
  protected readonly addBlockMarkings = true

  compileFromRoot(
    root: RootBlock,
    entrypoint: string,
    callbacks: SandboxCallbacks,
    invisibleCode: Record<string, string>
  ): CompilationResult {
    const functionBlocks = root.blocks.filter(({ block }) => block.type == BlockType.Function)
    let code =
      this.declareImports(callbacks) +
      "\n" +
      functionBlocks.map(it => this.compile(it.block)).join("\n") +
      "\n" +
      this.addCode(invisibleCode)
    return { code, entrypoint, argNames: [] }
  }

  compile<T, S>(
    block: Block<T extends BlockType ? T : never, S> | null,
    props?: InternalCompilationProps
  ): string {
    if (block == null) return ""
    if (![BlockType.Value, BlockType.Variable, BlockType.Function, BlockType.LogicNot, BlockType.LogicJunction, BlockType.LogicComparison].includes(block.type)) {
      return this.applyBlockMeta(
        block as Block<BlockType>,
        (block: Block<BlockType>, newProps?: InternalCompilationProps) =>
          this.handleProps(
            newProps ?? props,
            block,
            (block: Block<BlockType>, newProps?: InternalCompilationProps) =>
              this.compileByBlockType(block, newProps ?? props)
          )
      )
    }
    return this.compileByBlockType(block as Block<BlockType>, props)
  }

  protected compileByBlockType(block: Block<BlockType>, props?: InternalCompilationProps): string {
    const compileNext = (block: Block<BlockType>, newProps?: InternalCompilationProps) =>
      this.compile(block, newProps ?? props)

    switch (block.type) {
      case BlockType.Function:
        return this.compileFunction(block as Block<BlockType.Function>, compileNext, props)
      case BlockType.Expression:
        if ((block.data as BlockDataExpression).expression == DefinedExpression.Custom) {
          return this.compileCustomExpression(
            block as Block<BlockType.Expression>,
            compileNext,
            props
          )
        } else {
          return this.compileDefinedExpression(
            block as Block<BlockType.Expression>,
            compileNext,
            props
          )
        }
      case BlockType.Value:
        return this.compileValue(block as Block<BlockType.Value>, compileNext, props)
      case BlockType.Variable:
        return this.compileVariable(block as Block<BlockType.Variable>, compileNext, props)
      case BlockType.VarInit:
        return this.compileVariableInit(block as Block<BlockType.VarInit>, compileNext, props)
      case BlockType.VarSet:
        return this.compileVariableSet(block as Block<BlockType.VarSet>, compileNext, props)
      case BlockType.Loop:
        return this.compileLoop(block as Block<BlockType.Loop>, compileNext, props)
      case BlockType.Conditional:
        return this.compileConditional(block as Block<BlockType.Conditional>, compileNext, props)
      case BlockType.LogicNot:
        return this.compileLogicNot(block as Block<BlockType.LogicNot>, compileNext, props)
      case BlockType.LogicJunction:
        return this.compileLogicJunction(block as Block<BlockType.LogicJunction>, compileNext, props)
      case BlockType.LogicComparison:
        return this.compileLogicComparison(block as Block<BlockType.LogicComparison>, compileNext, props)
      default:
        throw new Error(`Block type ${block.type} is not implemented in base compiler`)
    }
  }

  markBlock(blockId: string): string {
    return this.callFunction("markBlock", `"${blockId}"`)
  }

  applyBlockMeta(block: Block<BlockType>, compile: typeof this.compileByBlockType): string {
    return this.markBlock(block.id) + this.wrapDelay(compile(block))
  }

  /** Handle information passed down the compile tree @param props the props to handle @param currentBlock block that is being compiled @param compile function to compile the current block with optionally modified props */
  abstract handleProps(
    props: InternalCompilationProps | undefined,
    currentBlock: Block<BlockType>,
    compile: typeof this.compile
  ): string
  /** Declare any initial setup needed to run the remaining code */
  abstract declareImports(callbacks: SandboxCallbacks): string
  /** Create a function call by name and args @param name function name @args vararg args */
  abstract callFunction(name: string, ...args: string[]): string
  /** Wrap code in a delay function @param code code to wrap */
  abstract wrapDelay(code: string): string
  /** Add arbitrary code by language */
  abstract addCode(codeByLang: Record<string, string>): string
  /** Compiles a **function** block. Function blocks must handle their own block meta.
   * @param block Function block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileFunction(
    block: Block<BlockType.Function>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **defined expression** block @param block Expression block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileDefinedExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **custom expression** block @param block Expression block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileCustomExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **value** block @param block Value block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileValue(
    block: Block<BlockType.Value>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **variable** block @param block Variable block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileVariable(
    block: Block<BlockType.Variable>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **initialize variable** block @param block Variable init block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileVariableInit(
    block: Block<BlockType.VarInit>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **set variable value** block @param block Variable set block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileVariableSet(
    block: Block<BlockType.VarSet>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **loop** block. Function blocks must handle their own block meta. @param block Loop block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileLoop(
    block: Block<BlockType.Loop>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **conditional** block @param block Conditional block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileConditional(
    block: Block<BlockType.Conditional>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **logic not** block @param block Logic Not block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileLogicNot(
    block: Block<BlockType.LogicNot>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **logic junction** block @param block Logic Junction block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileLogicJunction(
    block: Block<BlockType.LogicJunction>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
  /** Compiles a **logic comparison** block @param block Logic Comparison block to compile @param next function to compile connected blocks with optionally changed props @param props information passed down the compile tree */
  abstract compileLogicComparison(
    block: Block<BlockType.LogicComparison>,
    next: typeof this.compile,
    props?: InternalCompilationProps
  ): string
}
