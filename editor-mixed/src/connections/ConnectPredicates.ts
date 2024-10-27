import type { Connector } from "./Connector"
import { ConnectorType } from "./ConnectorType"

export type ConnectPredicate = (
  remoteConnector: Connector,
  localConnector: Connector
) => boolean
export class ConnectPredicates {
  localConnector: Connector
  predicates: ConnectPredicate[]

  constructor(localConnector: Connector, predicates: ConnectPredicate[]) {
    this.localConnector = localConnector
    this.predicates = predicates
  }

  add(predicate: ConnectPredicate) {
    this.predicates.push(predicate)
  }

  /**
   * Checks if the applied predicates allow connecting to the given remote connector
   * @param remoteConnector connector to evaluate connection to
   * @returns true if allowed; true for non-internal connectors when no predicates are applied
   */
  allows(remoteConnector: Connector): boolean {
    if (this.predicates.length === 0)
      return remoteConnector.type !== ConnectorType.Internal
    return this.predicates.some(it => it(remoteConnector, this.localConnector))
  }
}
