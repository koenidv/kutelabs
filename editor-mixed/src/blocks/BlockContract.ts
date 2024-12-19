import type { Connection } from "../connections/Connection"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { Coordinates } from "../util/Coordinates"
import type { AnyBlock, Block } from "./Block"

export interface BlockContract {
  silentConnect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction?: boolean
  ): void
  connect(
    blockRegistry: BlockRInterface,
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates
  ): void
  disconnectSelf(registry: BlockRInterface): AnyBlock | null
}
