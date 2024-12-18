import type { AnyBlock } from "../blocks/Block"
import type { Connection } from "../connections/Connection"
import type { Connector } from "../connections/Connector"
import type { Coordinates } from "../util/Coordinates"

export interface ConnectorRInterface {
  register(connector: Connector): void

  selectConnectorForBlock(
    block: AnyBlock,
    dragOffset: Coordinates,
    maxXY?: number
  ): Connection | null
}
