import type { AnyBlock } from "../blocks/Block"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import { ConnectorRole } from "./ConnectorRole"
import { ConnectorType } from "./ConnectorType"
import { ConnectPredicates, type ConnectPredicate } from "./ConnectPredicates"

export class Connector {
  type: ConnectorType
  role: ConnectorRole
  connectPredicates: ConnectPredicates

  constructor(
    type: ConnectorType,
    role: ConnectorRole = ConnectorRole.Default,
    connectPredicates: ConnectPredicate[] = []
  ) {
    this.type = type
    this.role = role
    this.connectPredicates = new ConnectPredicates(this, connectPredicates)
  }

  public register(registry: ConnectorRegistry, parentBlock: AnyBlock): this {
    if (this._parentBlock != null && parentBlock != this._parentBlock)
      throw new Error("Connector parent may not be changed")
    this._parentBlock = parentBlock
    registry.register(this)
    return this
  }

  private _parentBlock: AnyBlock | null = null
  public get parentBlock(): AnyBlock | null {
    return this._parentBlock
  }

  public globalPosition: Coordinates = Coordinates.zero

  get isDownstram() {
    return (
      this.type === ConnectorType.After ||
      this.type === ConnectorType.Inner ||
      this.type === ConnectorType.Extension
    )
  }
}

export type BlockAndConnector = { block: AnyBlock; connector: Connector }
