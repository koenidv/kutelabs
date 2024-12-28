import type { Block } from "../blocks/Block"
import type { BlockType } from "../blocks/configuration/BlockType"
import type { BlockMarking } from "../render/BlockRenderers/BaseBlockRenderer"
import { SizeProps } from "../render/SizeProps"
import { Coordinates } from "../util/Coordinates"

export type AnyRegisteredBlock = RegisteredBlock<any, any>

export class RegisteredBlock<T extends BlockType, S> {
  block: Block<T, S>

  isInvalidated = false
  globalPosition: Coordinates
  size: SizeProps
  marking: BlockMarking | null = null

  constructor(block: Block<T, S>, position: Coordinates = Coordinates.zero, size: SizeProps = SizeProps.zero) {
    this.block = block
    this.globalPosition = position
    this.size = size
  }
}