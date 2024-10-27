import type { Connector } from "../connections/Connector"
import { ConnectorType } from "../connections/ConnectorType"
import { Coordinates } from "../util/Coordinates"
import { Connection } from "../connections/Connection"
import type { AnyBlock } from "../blocks/Block"

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

  /**
   * All connectors must register themselves to be considered for snapping
   * @param connector Connector to register
   */
  public register(connector: Connector) {
    this._connectors.push(connector)
  }

  /**
   * Selects the closest suitable connector for a block to snap to
   *
   * Suitable connections are:
   * - before->after and after->before, before->extension, before->inner
   * - //todo Only if remote connector props allow it
   *
   * @param block Block to search connections from
   * @param dragOffset Delta between the block's calculated position and the dragged position
   * @param maxXY Maximum distance to search for connectors, area will be a square
   * @returns Connection (from-local) if a suitable connector was found, null otherwise
   */
  public selectConnectorForBlock(
    block: AnyBlock,
    dragOffset: Coordinates,
    maxXY: number = 25
  ): Connection | null {
    let localConnector: Connector | null = null
    let remoteConnector: Connector | null = null
    const connectedIds = [
      block.id,
      ...block.allConnectedRecursive.map(({ id }) => id),
    ]

    // Regular before->after / before->extension / before->inner
    localConnector = block.connectors.before
    if (localConnector) {
      remoteConnector = this.getClosestConnector(
        connectedIds,
        Coordinates.add(localConnector.globalPosition, dragOffset),
        [
          c => c.type === ConnectorType.After,
          c => c.type === ConnectorType.Extension,
          c => c.type === ConnectorType.Inner,
        ],
        maxXY
      )
      if (remoteConnector)
        return new Connection(localConnector, remoteConnector)
    }

    // reverse after->before
    localConnector = block.lastAfter.connectors.after
    if (localConnector) {
      remoteConnector = this.getClosestConnector(
        connectedIds,
        Coordinates.add(localConnector.globalPosition, dragOffset),
        [c => c.type === ConnectorType.Before],
        maxXY
      )
      if (remoteConnector)
        return new Connection(localConnector, remoteConnector)
    }

    return null
  }

  /**
   * Find the closest connector to a given position that matches one of the predicates
   * @param ignoreIds Don't return connectors from these blocks
   * @param position Center of the area to search
   * @param predicates OR List of predicates; a connector must match **at least one of them**
   * @param maxXY Radius of the area to search, will be a square
   * @returns Closest connector that matches the criteria, or null if none found
   */
  public getClosestConnector(
    ignoreIds: string[],
    position: Coordinates,
    predicates: ((c: Connector) => boolean)[],
    maxXY: number
  ): Connector | null {
    const connectors = this.getNearbyConnectors(
      ignoreIds,
      position,
      predicates,
      maxXY
    )
    if (connectors.length === 0) return null
    return this.sortConnectorsByDistance(position, connectors)[0]
  }

  /**
   * Find connectors in a given area that match one of the predicates
   * @param ingoreIds Don't return connectors from these blocks
   * @param position Center of the area to search
   * @param predicates OR List of predicates; a connector must match **at least one of them**
   * @param maxXY Radius of the area to search, will be a square
   * @returns List of connectors that match the criteria
   */
  public getNearbyConnectors(
    ingoreIds: string[],
    position: Coordinates,
    predicates: ((c: Connector) => boolean)[],
    maxXY: number
  ): Connector[] {
    return this._connectors.filter(connector => {
      if (connector.parentBlock === null) return false
      if (ingoreIds.includes(connector.parentBlock.id)) {
        return false
      }

      for (const predicate of predicates) {
        if (predicate(connector))
          return (
            Math.abs(connector.globalPosition.x - position.x) <= maxXY &&
            Math.abs(connector.globalPosition.y - position.y) <= maxXY
          )
      }

      return false
    })
  }

  /**
   * Sort connectors by distance to a given position (pythagorean)
   * @param position Center of the area to search
   * @param connectors List of connectors to sort
   * @returns Sorted list of connectors
   */
  public sortConnectorsByDistance(
    position: Coordinates,
    connectors: Connector[]
  ): Connector[] {
    return connectors.sort((a, b) => {
      const aDistance = Math.sqrt(
        Math.pow(a.globalPosition.x - position.x, 2) +
          Math.pow(a.globalPosition.y - position.y, 2)
      )
      const bDistance = Math.sqrt(
        Math.pow(b.globalPosition.x - position.x, 2) +
          Math.pow(b.globalPosition.y - position.y, 2)
      )
      return aDistance - bDistance
    })
  }
}
