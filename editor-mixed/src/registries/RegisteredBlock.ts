import type { Block } from "../blocks/Block"
import { Coordinates } from "../util/Coordinates"

export class RegisteredBlock {
  readonly block: Block

  globalPosition: Coordinates

  constructor(block: Block) {
    this.block = block
    this.globalPosition = Coordinates.zero
  }
}