import { Block, type AnyBlock } from "@kutelabs/editor-mixed/src/blocks/Block"
import { BlockType } from "@kutelabs/editor-mixed/src/blocks/configuration/BlockType"
import { DefinedExpression } from "@kutelabs/editor-mixed/src/blocks/configuration/DefinedExpression"
import { Connector } from "@kutelabs/editor-mixed/src/connections/Connector"
import { ConnectorRole } from "@kutelabs/editor-mixed/src/connections/ConnectorRole"
import { ConnectorType } from "@kutelabs/editor-mixed/src/connections/ConnectorType"
import { mockBlockRegistry } from "./blockregistry.mock"
import { mockConnectorRegistry } from "./connectorRegistry.mock"
import { RootBlock } from "@kutelabs/editor-mixed/src/blocks/RootBlock"
import { Connection } from "@kutelabs/editor-mixed/src/connections/Connection"
import { DrawerBlock } from "@kutelabs/editor-mixed/src/blocks/DrawerBlock"
import type { BlockDataByType } from "@kutelabs/editor-mixed/src/blocks/configuration/BlockData"

export const mockConnectorBefore = () => new Connector(ConnectorType.Before)
export const mockConnectorAfter = () => new Connector(ConnectorType.After)
export const mockConnectorExtensionInput = () =>
  new Connector(ConnectorType.Extension, ConnectorRole.Input)

export const mockRootBlock = () => new RootBlock(mockBlockRegistry(), mockConnectorRegistry() as any)
export const mockDrawerBlock = () => new DrawerBlock(mockBlockRegistry(), mockConnectorRegistry() as any)

export const mockBlock = (
  options: {
    type?: BlockType
    data?: BlockDataByType<BlockType, any>
    before?: { connector?: Connector; connected?: AnyBlock } | false
    after?: { connector?: Connector } | false
    connectToRoot?: boolean
  } = {}
) => {
  const block = new Block(
    options.type ?? BlockType.Expression,
    options.data ?? { expression: DefinedExpression.Println },
    [
      options.before !== false && {
        connector: options.before?.connector ?? mockConnectorBefore(),
      },
      options.after !== false && {
        connector: options.after?.connector ?? mockConnectorAfter(),
      },
    ].filter(Boolean) as Array<{ connector: Connector }>,
    true,
    mockBlockRegistry(),
    mockConnectorRegistry()
  )
  if (options.connectToRoot) {
    const root = mockRootBlock()
    root.connect(
      mockBlockRegistry(),
      block,
      new Connection(root.rootConnector, block.connectors.internal)
    )
  }
  return block
}

export const mockPredicateAlwaysAllow = () => () => true
export const mockPredicateAlwaysDecline = () => () => false
