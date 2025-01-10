import type { AnyBlock } from "../blocks/Block"
import type { ConnectorRInterface } from "../registries/ConnectorRInterface"
import { Coordinates } from "../util/Coordinates"
import { ConnectorRole } from "./ConnectorRole"
import { ConnectorType } from "./ConnectorType"
import { ConnectPredicates, type ConnectPredicate } from "./ConnectPredicates"

export class Connector {
  type: ConnectorType
  role: ConnectorRole
  connectPredicates: ConnectPredicates

  globalPosition: Coordinates

  constructor(
    type: ConnectorType,
    role: ConnectorRole = ConnectorRole.Default,
    connectPredicates: ConnectPredicate[] = [],
    position: Coordinates = Coordinates.zero
  ) {
    this.type = type
    this.role = role
    this.connectPredicates = new ConnectPredicates(this, connectPredicates)
    this.globalPosition = position
  }

  public register(registry: ConnectorRInterface, parentBlock: AnyBlock): this {
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

  get isDownstream() {
    return (
      this.type === ConnectorType.After ||
      this.type === ConnectorType.Inner ||
      this.type === ConnectorType.Extension
    )
  }
}

export type BlockAndConnector = { block: AnyBlock; connector: Connector }
