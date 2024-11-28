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

export function createFunctionBlock(
  previousBlock: AnyBlock | null,
  data: BlockDataFunction,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Function> {
  return new Block<BlockType.Function>(
    previousBlock,
    BlockType.Function,
    data,
    [DefaultConnectors.innerLoop()],
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createExpressionBlock(
  previousBlock: AnyBlock | null,
  data: BlockDataExpression,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Expression> {
  return new Block<BlockType.Expression>(
    previousBlock,
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
  previousBlock: AnyBlock | null,
  data: BlockDataValue<T>,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Value> {
  return new Block<BlockType.Value, T extends ValueDataType ? T : never>(
    previousBlock,
    BlockType.Value,
    data,
    [DefaultConnectors.extender()],
    true,
    blockRegistry,
    connectorRegistry
  )
}

export function createVariableBlock<T extends ValueDataType>(
  previousBlock: AnyBlock | null,
  data: BlockDataVariable<T>,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): Block<BlockType.Variable, T extends ValueDataType ? T : never> {
  return new Block<BlockType.Variable, T extends ValueDataType ? T : never>(
    previousBlock,
    BlockType.Variable,
    data,
    [DefaultConnectors.extender()],
    true,
    blockRegistry,
    connectorRegistry
  )
}
