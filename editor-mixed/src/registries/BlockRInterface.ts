import type { AnyBlock } from "../blocks/Block"
import type { SizeProps } from "../render/SizeProps"
import type { Coordinates } from "../util/Coordinates"
import type { Emitter } from "../util/Emitter"
import type { AnyRegisteredBlock } from "./RegisteredBlock"

export type BlockREvents = {
  workspaceAdded: { block: AnyBlock } // todo this should also fire when attaching to other blocks that are already in the workspace, but that would require a dis/connect refactor
  workspaceRemoved: { block: AnyBlock }
}

export interface BlockRInterface extends Emitter<BlockREvents> {
  register(block: AnyBlock): void
  deregister(block: AnyBlock): void
  getRegisteredById(id: string): AnyRegisteredBlock | undefined

  notifyDisconnecting(block: AnyBlock, from: AnyBlock): void
  notifyConnecting(block: AnyBlock, to: AnyBlock): void

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
