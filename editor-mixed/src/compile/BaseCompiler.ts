import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/BlockType"
import type { RootBlock } from "../blocks/RootBlock"

export abstract class BaseCompiler {
  compileFromRoot(root: RootBlock, mainCall: boolean): string {
    const functionBlocks = root.blocks.filter(
      ({ block }) => block.type == BlockType.Function
    )
    let code = functionBlocks.map(it => this.compile(it.block)).join("\n")

    if (mainCall) return [code, this.mainCall()].join("\n")
    else return code
  }

  compile(block: Block<BlockType>): string {
    switch (block.type) {
      case BlockType.Function:
        return this.compileFunction(
          block,
          this.compile
        )
      case BlockType.Expression:
        return this.compileExpression(
          block,
          this.compile
        )
      case BlockType.Input:
        return this.compileInput(
          block,
          this.compile
        )
      case BlockType.Var:
        return this.compileVar(block, this.compile)
      case BlockType.Loop:
        return this.compileLoop(block, this.compile)
      case BlockType.Conditional:
        return this.compileConditional(block, this.compile)
      default:
        throw new Error(
          `Block type ${BlockType[block.type]} is not implemented in base compiler`
        )
    }
  }

  abstract compileFunction(
    block: Block<BlockType.Function>,
    next: typeof this.compile
  ): string
  abstract compileExpression(
    block: Block<BlockType.Expression>,
    next: typeof this.compile
  ): string
  abstract compileInput(
    block: Block<BlockType.Input>,
    next: typeof this.compile
  ): string
  abstract compileVar(block: Block<BlockType.Var>, next: typeof this.compile): string
  abstract compileLoop(block: Block<BlockType.Loop>, next: typeof this.compile): string
  abstract compileConditional(block: Block<BlockType.Conditional>, next: typeof this.compile): string

  abstract mainCall(): string
}
