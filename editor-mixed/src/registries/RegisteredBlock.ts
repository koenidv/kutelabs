import type { Block } from "../blocks/Block"
import type { SizeProps } from "../render/SizeProps"
import { Coordinates } from "../util/Coordinates"

export class RegisteredBlock {
  readonly block: Block

  isInvalidated = false
  globalPosition: Coordinates
  size: SizeProps | null = null

  constructor(block: Block) {
    this.block = block
    this.globalPosition = Coordinates.zero
  }
}