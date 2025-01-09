import { Block } from "@kutelabs/editor-mixed/src/blocks/Block"
import { BlockType } from "@kutelabs/editor-mixed/src/blocks/configuration/BlockType"
import { DefinedExpression } from "@kutelabs/editor-mixed/src/blocks/configuration/DefinedExpression"
import { Connector } from "@kutelabs/editor-mixed/src/connections/Connector"
import { ConnectorRole } from "@kutelabs/editor-mixed/src/connections/ConnectorRole"
import { ConnectorType } from "@kutelabs/editor-mixed/src/connections/ConnectorType"
import { mockBlockRegistry } from "./blockregistry.mock"
import { mockConnectorRegistry } from "./connectorRegistry.mock"

export const RootConnector = new Connector(ConnectorType.Internal, ConnectorRole.Root)
export const ConnectorBefore = () => new Connector(ConnectorType.Before)
export const ConnectorAfter = () => new Connector(ConnectorType.After)

export const BlockExpression = (before = ConnectorBefore(), after = ConnectorAfter()) =>
  new Block(
    BlockType.Expression,
    { expression: DefinedExpression.Println },
    [{ connector: before }, { connector: after }],
    true,
    mockBlockRegistry(),
    mockConnectorRegistry()
  )

export const PredicateAlwaysAllow = () => () => true
export const PredicateAlwaysDecline = () => () => false
