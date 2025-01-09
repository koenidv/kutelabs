import type { AnyBlock } from "../blocks/Block"
import type { Connector } from "./Connector"

export class Connection {
  from: Connector
  to: Connector

  constructor(from: Connector, to: Connector
  ) {
    this.from = from
    this.to = to
  }

  localConnector(block: AnyBlock): Connector | null { 
    if (this.from.parentBlock?.id === block.id) return this.from
    else if (this.to.parentBlock?.id === block.id) return this.to
    else return null
  }
}

export type BlockAndConnection = { block: AnyBlock, connection: Connection }
