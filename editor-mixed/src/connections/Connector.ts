import type { AnyBlock, Block } from "../blocks/Block"
import type { BlockType } from "../blocks/BlockType"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import { ConnectorRole } from "./ConnectorRole"
import { ConnectorType } from "./ConnectorType"

export class Connector {
  type: ConnectorType
  role: ConnectorRole

  constructor(
    type: ConnectorType,
    role: ConnectorRole = ConnectorRole.Default
  ) {
    this.type = type
    this.role = role
    ConnectorRegistry.instance.register(this)
  }

  private _parentBlock: AnyBlock | null = null
  public get parentBlock(): AnyBlock | null {
    return this._parentBlock
  }
  public set parentBlock(value: AnyBlock | null) {
    if (this._parentBlock != null && value != this._parentBlock)
      throw new Error("Connector parent may not be changed")
    this._parentBlock = value
  }

  public globalPosition: Coordinates = Coordinates.zero

  get isDownstram() {
    return (
      this.type === ConnectorType.After ||
      this.type === ConnectorType.Inner ||
      this.type === ConnectorType.Extension
    )
  }

  static internal() {
    return new Connector(ConnectorType.Internal)
  }
  static Root = new Connector(ConnectorType.Internal)
}

export type BlockAndConnector = { block: AnyBlock; connector: Connector }
