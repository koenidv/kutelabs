import type { Block } from "typescript"
import type { Connector } from "./Connector"

export type Connection = {
  from: Connector
  to: Connector
}

export type BlockAndConnection = { block: Block, connection: Connection }
