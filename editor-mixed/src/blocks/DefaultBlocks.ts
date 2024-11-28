import type { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Block, type AnyBlock } from "./Block"
import type {
  BlockDataExpression,
  BlockDataFunction,
  BlockDataValue,
  BlockDataVariable,
} from "./configuration/BlockData"
import { BlockType } from "./configuration/BlockType"
import type { ValueDataType } from "./configuration/ValueDataType"

function mergeConnectors(
  incoming: { connector: Connector; connected?: AnyBlock | undefined }[],
  existing: Connector[]
): { connector: Connector; connected?: AnyBlock | undefined }[] {
  existing.forEach(connector => {
    if (
      !incoming.find(
        it =>
          it.connector.type === connector.type &&
          it.connector.role === connector.role
      )
    ) {
      incoming.push({ connector, connected: undefined })
    }
  })
  return incoming
}

export function createFunctionBlock(
  data: BlockDataFunction,
  connectedBlocks: { connector: Connector; connected?: AnyBlock | undefined }[],
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Function> {
  return new Block<BlockType.Function>(
    BlockType.Function,
    data,
    mergeConnectors(connectedBlocks, [DefaultConnectors.innerLoop()]),
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createExpressionBlock(
  data: BlockDataExpression,
  connectedBlocks: { connector: Connector; connected?: AnyBlock | undefined }[],
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Expression> {
  return new Block<BlockType.Expression>(
    BlockType.Expression,
    data,
    mergeConnectors(connectedBlocks, [
      DefaultConnectors.before(),
      DefaultConnectors.after(),
      DefaultConnectors.inputExtension(), // todo variable input count
    ]),
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createValueBlock<T extends ValueDataType>(
  data: BlockDataValue<T>,
  connectedBlocks: { connector: Connector; connected?: AnyBlock | undefined }[],
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Value> {
  return new Block<BlockType.Value, T extends ValueDataType ? T : never>(
    BlockType.Value,
    data,
    mergeConnectors(connectedBlocks, [DefaultConnectors.extender()]),
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createVariableBlock<T extends ValueDataType>(
  data: BlockDataVariable<T>,
  connectedBlocks: { connector: Connector; connected?: AnyBlock | undefined }[],
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Variable, T extends ValueDataType ? T : never> {
  return new Block<BlockType.Variable, T extends ValueDataType ? T : never>(
    BlockType.Variable,
    data,
    mergeConnectors(connectedBlocks, [DefaultConnectors.extender()]),
    true,
    blockRegistry,
    connectorRegistry
  )
}
