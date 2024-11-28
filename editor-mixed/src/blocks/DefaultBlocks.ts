import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Block } from "./Block"
import type {
  BlockDataExpression,
  BlockDataFunction,
  BlockDataValue,
  BlockDataVariable,
} from "./configuration/BlockData"
import { BlockType } from "./configuration/BlockType"
import type { ValueDataType } from "./configuration/ValueDataType"

function getPreviousBlock(
  previousBlockId: string | undefined,
  blockRegistry: BlockRegistry
): Block<BlockType> | null {
  return previousBlockId
    ? (blockRegistry.getRegisteredById(previousBlockId)?.block ?? null)
    : null
}

export function createFunctionBlock(
  previousBlockId: string | undefined,
  data: BlockDataFunction,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Function> {
  return new Block<BlockType.Function>(
    getPreviousBlock(previousBlockId, blockRegistry),
    BlockType.Function,
    data,
    [DefaultConnectors.innerLoop()],
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createExpressionBlock(
  previousBlockId: string | undefined,
  data: BlockDataExpression,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Expression> {
  return new Block<BlockType.Expression>(
    getPreviousBlock(previousBlockId, blockRegistry),
    BlockType.Expression,
    data,
    [
      DefaultConnectors.before(),
      DefaultConnectors.after(),
      DefaultConnectors.inputExtension(), // todo variable input count
    ],
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createValueBlock<T extends ValueDataType>(
  previousBlockId: string | undefined,
  data: BlockDataValue<T>,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Value> {
  return new Block<BlockType.Value, T extends ValueDataType ? T : never>(
    getPreviousBlock(previousBlockId, blockRegistry),
    BlockType.Value,
    data,
    [DefaultConnectors.extender()],
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createVariableBlock<T extends ValueDataType>(
  previousBlockId: string | undefined,
  data: BlockDataVariable<T>,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Variable, T extends ValueDataType ? T : never> {
  return new Block<BlockType.Variable, T extends ValueDataType ? T : never>(
    getPreviousBlock(previousBlockId, blockRegistry),
    BlockType.Variable,
    data,
    [DefaultConnectors.extender()],
    true,
    blockRegistry,
    connectorRegistry
  )
}
