import type { Connector } from "../connections/Connector"
import { ConnectorType } from "../connections/ConnectorType"

export class BlockConnectors {
  _connectors: Map<ConnectorType, Connector> = new Map()
  _innerConnectors: Connector[] = []
  _extensionConnectors: Connector[] = []

  addConnector(...connectors: Connector[]) {
    connectors.forEach(connector => {
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
    })
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

  get internal() {
    return this._connectors.get(ConnectorType.Internal) ?? null
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
  get extensions() {
    return this._extensionConnectors
  }
}
