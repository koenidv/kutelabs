import type { Block } from "../blocks/Block"
import { Coordinates } from "../util/Coordinates"
import { ConnectorType } from "./ConnectorType"

export class Connector {
  type: ConnectorType

  constructor(type: ConnectorType) {
    this.type = type
  }

  private _parentBlock: Block | null = null
  public get parentBlock(): Block | null {
    return this._parentBlock
  }
  public set parentBlock(value: Block | null) {
    if (this._parentBlock)
      throw new Error("Connector parent may not be changed")
    this._parentBlock = value
  }

  public globalPosition: Coordinates = Coordinates.zero

  get isDownstram() {
    return (
      this.type === ConnectorType.After ||
      this.type === ConnectorType.Inner ||
      this.type === ConnectorType.Extension ||
      this.type === ConnectorType.Internal
    )
  }

  static internal() {
    return new Connector(ConnectorType.Internal)
  }
  static Root = new Connector(ConnectorType.Internal)
}

export type BlockAndConnector = { block: Block; connector: Connector }
