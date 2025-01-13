import type { Connector } from "../connections/Connector"
import { ConnectorType } from "../connections/ConnectorType"
import { ConnectorRole } from "../connections/ConnectorRole"
import type { AnyBlock } from "./Block"
import type { ConnectorRInterface } from "../registries/ConnectorRInterface"

export class BlockConnectors {
  private _connectors: Map<ConnectorType, Connector> = new Map()
  private _innerConnectors: Connector[] = []
  private _extensionConnectors: Connector[] = []

  addConnector(parentBlock: AnyBlock, registry: ConnectorRInterface, connector: Connector) {
    connector.register(registry, parentBlock)

    switch (connector.type) {
      case ConnectorType.Inner:
        this.addInner(connector)
        break
      case ConnectorType.Extension:
        this.addExtension(connector)
        break
      default:
        this.addRegular(connector)
    }
  }

  private addRegular(connector: Connector) {
    this._connectors.set(connector.type, connector)
  }

  private addInner(connector: Connector) {
    this._innerConnectors.push(connector)
  }

  private addExtension(connector: Connector) {
    this._extensionConnectors.push(connector)
  }

  get all() {
    return [...this._connectors.values(), ...this._innerConnectors, ...this._extensionConnectors]
  }

  get internal(): Connector {
    return this._connectors.get(ConnectorType.Internal)!
  }
  get before() {
    return this._connectors.get(ConnectorType.Before) ?? null
  }
  get after() {
    return this._connectors.get(ConnectorType.After) ?? null
  }
  get inners() {
    return this._innerConnectors
  }
  get inputExtensions() {
    return this._extensionConnectors.filter(it => it.role != ConnectorRole.Output)
  }
  get outputExtension() {
    return this._extensionConnectors.filter(it => it.role == ConnectorRole.Output).firstOrNull()
  }

  byRole(role: ConnectorRole): Connector[] {
    return this.all.filter(connector => connector.role == role)
  }

  removeConnector(registry: ConnectorRInterface, connector: Connector) {
    connector.deregister(registry)
    this._connectors.delete(connector.type)
    this._innerConnectors = this._innerConnectors.filter(it => it != connector)
    this._extensionConnectors = this._extensionConnectors.filter(it => it != connector)
  }
}
