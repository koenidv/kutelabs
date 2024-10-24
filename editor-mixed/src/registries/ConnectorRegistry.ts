import type { Connector } from "../connections/Connector"
import type { ConnectorType } from "../connections/ConnectorType"
import type { Coordinates } from "../util/Coordinates"

export class ConnectorRegistry {
  private static _instance: ConnectorRegistry
  public static get instance(): ConnectorRegistry {
    if (!ConnectorRegistry._instance) {
      ConnectorRegistry._instance = new ConnectorRegistry()
    }
    return ConnectorRegistry._instance
  }

  private _connectors: Connector[] = []
  public get connectors(): Connector[] {
    return this._connectors
  }

  public registerConnector(connector: Connector) {
    this._connectors.push(connector)
  }



  public getClosestConnector(ignoreIds: string[], position: Coordinates, types: ConnectorType[], maxXY: number): Connector | null {
    const connectors = this.getNearbyConnectors(ignoreIds, position, types, maxXY)
    if (connectors.length === 0) return null
    return this.sortConnectorsByDistance(position, connectors)[0]
  }

  public getNearbyConnectors(ingoreIds: string[], position: Coordinates, types: ConnectorType[], maxXY: number): Connector[] {
    return this._connectors.filter(connector => {
      if (connector.parentBlock === null) return false
      if (ingoreIds.includes(connector.parentBlock.id)) {
        return false
      }
      if (types.includes(connector.type)) {
        return Math.abs(connector.globalPosition.x - position.x) <= maxXY && Math.abs(connector.globalPosition.y - position.y) <= maxXY
      }
      return false
    })
  }

  public sortConnectorsByDistance(position: Coordinates, connectors: Connector[]): Connector[] {
    return connectors.sort((a, b) => {
      const aDistance = Math.sqrt(Math.pow(a.globalPosition.x - position.x, 2) + Math.pow(a.globalPosition.y - position.y, 2))
      const bDistance = Math.sqrt(Math.pow(b.globalPosition.x - position.x, 2) + Math.pow(b.globalPosition.y - position.y, 2))
      return aDistance - bDistance
    })
  }

}