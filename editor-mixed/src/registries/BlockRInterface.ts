import type { AnyBlock } from "../blocks/Block"
import type { SizeProps } from "../render/SizeProps"
import type { Coordinates } from "../util/Coordinates"
import type { AnyRegisteredBlock } from "./RegisteredBlock"

export interface BlockRInterface {
  register(block: AnyBlock): void
  getRegisteredById(id: string): AnyRegisteredBlock | undefined

  attachToRoot(block: AnyBlock, modifyPosition: (current: Coordinates) => Coordinates): void
  attachToDrawer(block: AnyBlock): void

  setSize(block: AnyBlock, size: SizeProps): AnyRegisteredBlock
  getSize(block: AnyBlock): SizeProps
  setPosition(block: AnyBlock, position: Coordinates): AnyRegisteredBlock
  getPosition(block: AnyBlock): Coordinates

  detachedBlockIds: string[]
  setDetached(block: AnyBlock): void
  leafs: AnyBlock[]
  downstreamBlocksMeasuredAndValid(block: AnyBlock): boolean
  clear(): void
}
