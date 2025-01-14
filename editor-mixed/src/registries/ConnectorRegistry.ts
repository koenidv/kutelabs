import type { Connector } from "../connections/Connector"
import { Coordinates } from "../util/Coordinates"
import { Connection } from "../connections/Connection"
import type { AnyBlock } from "../blocks/Block"
import type { ConnectorRInterface } from "./ConnectorRInterface"
import type { VariableHInterface } from "../sideeffects/VariableHInterface"
import { BlockType } from "../blocks/configuration/BlockType"

export class ConnectorRegistry implements ConnectorRInterface {
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
   * Deregister a single connector
   * @param connector Connector to deregister
   */
  public deregister(connector: Connector): void {
    this._connectors = this._connectors.filter(it => it !== connector)
  }

  /**
   * Deregister all connectors that belong to a block, used when a block is removed
   * @param block Block to deregister connectors for
   */
  public deregisterForBlock(block: AnyBlock): void {
    this._connectors = this._connectors.filter(
      connector => connector.parentBlock === null || connector.parentBlock.id !== block.id
    )
  }

  /**
   * Selects the closest suitable connector for a block to snap to
   *
   * Suitable connections are:
   * - before->after and after->before, before->extension, before->inner and inner->before
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
    const connectedIds = [block.id, ...block.allConnectedRecursive.map(({ id }) => id)]

    // Regular before->after / before->extension / before->inner
    localConnector = block.connectors.before
    if (localConnector) {
      remoteConnector = this.getClosestConnector(
        localConnector,
        connectedIds,
        Coordinates.add(localConnector.globalPosition, dragOffset),
        maxXY
      )
      if (remoteConnector) return new Connection(localConnector, remoteConnector)
    }

    // reverse after->before
    localConnector = block.lastAfter.connectors.after
    if (localConnector) {
      remoteConnector = this.getClosestConnector(
        localConnector,
        connectedIds,
        Coordinates.add(localConnector.globalPosition, dragOffset),
        maxXY
      )
      if (remoteConnector) return new Connection(localConnector, remoteConnector)
    }

    // reverse inner->before
    for (const localConnector of block.connectors.inners) {
      remoteConnector = this.getClosestConnector(
        localConnector,
        connectedIds,
        Coordinates.add(localConnector.globalPosition, dragOffset),
        maxXY
      )
      if (remoteConnector) return new Connection(localConnector, remoteConnector)
    }

    return null
  }

  /**
   * Finds all unoccupied matching upstream connections for a block and 
   * lists them in order XY position, starting from the current connector y position.
   * Upstream connections connect _from before_ **to** an after/inner/extension connector
   * @param block Block to search connections for
   */
  public listUpstreamFreeConnections(block: AnyBlock) {
    if (!block.connectors.before) return []
    const connectedIds = [block.id, ...block.allConnectedRecursive.map(({ id }) => id)]
    const connectors = this.getNearbyConnectors(
      block.connectors.before,
      connectedIds,
      block.connectors.before.globalPosition,
      null
    )
    const free = connectors.filter(
      connector =>
        connector.parentBlock &&
        connector.parentBlock.connectedBlocks.byConnector(connector) === null
    )
    return this.sortConnectorsXY(block.connectors.before.globalPosition.y, free).map(
      connector => new Connection(block.connectors.before!, connector)
    )
  }

  /**
   * Find the closest connector to a given position that matches one of the predicates
   * @param localConnector connector to search connection for, will invoke the predicates
   * @param ignoreIds Don't return connectors from these blocks
   * @param position Center of the area to search
   * @param maxXY Radius of the area to search, will be a square
   * @returns Closest connector that matches the criteria, or null if none found
   */
  public getClosestConnector(
    localConnector: Connector,
    ignoreIds: string[],
    position: Coordinates,
    maxXY: number
  ): Connector | null {
    const connectors = this.getNearbyConnectors(localConnector, ignoreIds, position, maxXY)
    if (connectors.length === 0) return null
    return this.sortConnectorsByDistance(position, connectors)[0]
  }

  /**
   * Find connectors in a given area that match one of the predicates
   * @param localConnector connector to search connection for, will invoke the predicates
   * @param ingoreIds Don't return connectors from these blocks
   * @param position Center of the area to search
   * @param maxXY Radius of the area to search, will be a square
   * @returns List of connectors that match the criteria
   */
  public getNearbyConnectors(
    localConnector: Connector,
    ingoreIds: string[],
    position: Coordinates,
    maxXY: number | null
  ): Connector[] {
    return this._connectors.filter(connector => {
      if (
        maxXY !== null &&
        (Math.abs(connector.globalPosition.x - position.x) > maxXY ||
          Math.abs(connector.globalPosition.y - position.y) > maxXY)
      ) {
        return false
      }

      if (connector.parentBlock === null) return false
      if (ingoreIds.includes(connector.parentBlock.id)) return false

      if (
        localConnector.connectPredicates.allows(connector) &&
        connector.connectPredicates.allows(localConnector)
      ) {
        return true
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
  public sortConnectorsByDistance(position: Coordinates, connectors: Connector[]): Connector[] {
    return [...connectors].sort((a, b) => {
      const aDistance = Math.sqrt(
        Math.pow(a.globalPosition.x - position.x, 2) + Math.pow(a.globalPosition.y - position.y, 2)
      )
      const bDistance = Math.sqrt(
        Math.pow(b.globalPosition.x - position.x, 2) + Math.pow(b.globalPosition.y - position.y, 2)
      )
      return aDistance - bDistance
    })
  }

  /**
   * Sort connectory by increasing y and x, starting from a given position.
   * Positions with y < start will be sorted last
   * Sorts by x/y larger than start first, x second, y third
   *
   * @param start workspace y position to start sorting from
   * @param connectors list of connectors to sort
   */
  public sortConnectorsXY(start: number, connectors: Connector[]): Connector[] {
    return [...connectors].sort(
      (a, b) =>
        (a.globalPosition.y <= start && b.globalPosition.y > start ? 1 : 0) ||
        (b.globalPosition.y <= start && a.globalPosition.y > start ? -1 : 0) ||
        a.globalPosition.y - b.globalPosition.y ||
        a.globalPosition.x - b.globalPosition.x
    )
  }

  public clear() {
    this._connectors = []
  }
}
