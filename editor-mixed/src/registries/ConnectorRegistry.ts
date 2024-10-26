import type { Connector } from "../connections/Connector"
import { ConnectorType } from "../connections/ConnectorType"
import { Coordinates } from "../util/Coordinates"
import { Connection } from "../connections/Connection"
import type { Block } from "../blocks/Block"

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

  public register(connector: Connector) {
    this._connectors.push(connector)
  }

  public selectConnectorForBlock(block: Block, dragOffset: Coordinates, maxXY: number = 25): Connection | null {
    let localConnector: Connector | null = null
    let remoteConnector: Connector | null = null
    const connectedIds =[
      block.id,
      ...block.allConnectedRecursive.map(({ id }) => id),
    ]

    // Regular before->after / before->extension / before->inner
    localConnector = block.connectors.before
    if (localConnector) {
      remoteConnector = this.getClosestConnector(connectedIds, Coordinates.add(localConnector.globalPosition, dragOffset), [ConnectorType.After, ConnectorType.Extension, ConnectorType.Inner], maxXY)
      if (remoteConnector) return new Connection(localConnector, remoteConnector)
    }

    // reverse after->before
    localConnector = block.lastAfter.connectors.after
    if (localConnector) {
      // const offset = subtractCoordinates(localConnector.calculatedPosition, block.calculatedPosition)
      remoteConnector = this.getClosestConnector(connectedIds, Coordinates.add(localConnector.globalPosition, dragOffset), [ConnectorType.Before], maxXY)
      if (remoteConnector) return new Connection(localConnector, remoteConnector)
    }

    return null
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