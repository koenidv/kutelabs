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
  compileFromRoot(root: RootBlock, entrypoint: string): CompilationResult {
    const functionBlocks = root.blocks.filter(({ block }) => block.type == BlockType.Function)
    let code = functionBlocks.map(it => this.compile(it.block)).join("\n")
    return { code, entrypoint, argNames: [] }
  }

  compile(block: Block<BlockType> | null): string {
    if (block == null) return ""
    switch (block.type) {
      case BlockType.Function:
        return this.compileFunction(block, this.compile.bind(this))
      case BlockType.Expression:
        if ((block.data as BlockDataExpression).expression == DefinedExpression.Custom) {
          return this.compileCustomExpression(block, this.compile.bind(this))
        } else {
          return this.compileDefinedExpression(block, this.compile.bind(this))
        }
      case BlockType.Value:
        return this.compileValue(block, this.compile.bind(this))
      case BlockType.Variable:
        return this.compileVariable(block, this.compile.bind(this))
      case BlockType.Loop:
        return this.compileLoop(block, this.compile.bind(this))
      case BlockType.Conditional:
        return this.compileConditional(block, this.compile.bind(this))
      default:
        throw new Error(`Block type ${block.type} is not implemented in base compiler`)
    }
  }

  abstract compileFunction(block: Block<BlockType.Function>, next: typeof this.compile): string
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
  abstract compileLoop(block: Block<BlockType.Loop>, next: typeof this.compile): string
  abstract compileConditional(
    block: Block<BlockType.Conditional>,
    next: typeof this.compile
  ): string
}
