import { Block, type AnyBlock } from "../blocks/Block"
import type {
  BlockDataByType,
  BlockDataExpression,
  BlockDataValue,
} from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import {
  createExpressionBlock,
  createFunctionBlock,
  createValueBlock,
  createVariableBlock,
} from "../blocks/DefaultBlocks"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import type {
  MixedContentEditorBlock,
  MixedContentEditorConfiguration,
} from "./editor"

export function applyData(
  data: MixedContentEditorConfiguration,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): void {
  applyDrawerBlocks(data, blockRegistry, connectorRegistry)
}

function applyDrawerBlocks(
  data: MixedContentEditorConfiguration,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): void {
  console.log("data.initialDrawerBlocks :>> ", data.initialDrawerBlocks)
  for (const block of data.initialDrawerBlocks) {
    console.log("block :>> ", block)
    blockRegistry.attachToDrawer(
      parseBlock(block, blockRegistry, connectorRegistry)
    )
  }
}

function parseBlock(
  {
    block,
    previousBlockId,
    coordinates,
  }: MixedContentEditorBlock & {
    previousBlockId?: string
    coordinates?: {
      [k: string]: unknown
    }
  },
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): AnyBlock {
  switch (block.type) {
    case "function":
      return createFunctionBlock(
        previousBlockId,
        block.data,
        blockRegistry,
        connectorRegistry
      )
    case "expression":
      if (block.data.customExpression) {
        ;(block.data as BlockDataExpression).customExpression = new Map(
          Object.entries(block.data.customExpression as object)
        )
      }
      return createExpressionBlock(
        previousBlockId,
        block.data as BlockDataExpression,
        blockRegistry,
        connectorRegistry
      )
    case "value":
      return createValueBlock(
        previousBlockId,
        block.data as any, // todo
        blockRegistry,
        connectorRegistry
      )
    case "variable":
      return createVariableBlock(
        previousBlockId,
        block.data as any, // todo
        blockRegistry,
        connectorRegistry
      )
  }
}

function parseBlockType(typeName: string): BlockType {
  const key = Object.keys(BlockType).find(
    it => it.toLowerCase() == typeName.toLowerCase()
  ) as keyof typeof BlockType
  if (!key) throw new Error(`Block type not found for value: ${typeName}`)
  return BlockType[key]
}
