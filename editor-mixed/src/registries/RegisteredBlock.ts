import type { Block } from "../blocks/Block"
import type { BlockType } from "../blocks/configuration/BlockType"
import type { SizeProps } from "../render/SizeProps"
import { Coordinates } from "../util/Coordinates"

export type AnyRegisteredBlock = RegisteredBlock<BlockType>

export class RegisteredBlock<T extends BlockType> {
  block: Block<T>

  isInvalidated = false
  globalPosition: Coordinates
  size: SizeProps | null = null

  constructor(block: Block<T>, position: Coordinates = Coordinates.zero, size: SizeProps | null = null) {
    this.block = block
    this.globalPosition = position
    this.size = size
  }
}