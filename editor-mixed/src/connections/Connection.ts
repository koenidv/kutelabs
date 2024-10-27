import type { AnyBlock, Block } from "../blocks/Block"
import type { Connector } from "./Connector.1"

export class Connection {
  from: Connector
  to: Connector

  constructor(from: Connector, to: Connector
  ) {
    this.from = from
    this.to = to
  }

  localConnector(block: AnyBlock): Connector | null { 
    if (this.from.parentBlock === block) return this.from
    else if (this.to.parentBlock === block) return this.to
    else return null
  }
}

export type BlockAndConnection = { block: AnyBlock, connection: Connection }
