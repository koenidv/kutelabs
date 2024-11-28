import type { AnyBlock, Block } from "../blocks/Block"
import type { BlockType } from "../blocks/configuration/BlockType"
import type { SizeProps } from "../render/SizeProps"
import { Coordinates } from "../util/Coordinates"

export type AnyRegisteredBlock = RegisteredBlock<BlockType>

export class RegisteredBlock<T extends BlockType> {
  readonly block: Block<T>

  isInvalidated = false
  globalPosition: Coordinates
  size: SizeProps | null = null

  constructor(block: Block<T>) {
    this.block = block
    this.globalPosition = Coordinates.zero
  }
}