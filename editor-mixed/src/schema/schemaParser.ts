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
      parseBlock(block, null, blockRegistry, connectorRegistry)
    )
  }
}

// function applyWorkspaceBlocks(
//   data: MixedContentEditorConfiguration,
//   blockRegistry: BlockRegistry,
//   connectorRegistry: ConnectorRegistry
// ): void {
//   for (const block of data.initialBlocks) {
//     if ("previousBlockId" in block) {
//       const previousBlock = blockRegistry.getRegisteredById(
//         block.previousBlockId
//       )?.block
      
//       if (!previousBlock) {
//         console.error(`Previous block (${block.previousBlockId}) not found! Is it defined before this block and is the block id correct?`)
//         continue
//       }

//       // blockRegistry.attachToRoot(
//       //   parseBlock(block, previousBlock, blockRegistry, connectorRegistry)
//       // )
//     }

//     if (block.previousBlockId == null) {
//     blockRegistry
//     blockRegistry.attachToRoot(
//       parseBlock(block, blockRegistry, connectorRegistry)
//     )
//   }
// }

function parseBlock(
  block: MixedContentEditorBlock,
  previousBlock: AnyBlock | null,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): AnyBlock {
  switch (block.type) {
    case "function":
      return createFunctionBlock(
        previousBlock,
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
        previousBlock,
        block.data as BlockDataExpression,
        blockRegistry,
        connectorRegistry
      )
    case "value":
      return createValueBlock(
        previousBlock,
        block.data as any, // todo
        blockRegistry,
        connectorRegistry
      )
    case "variable":
      return createVariableBlock(
        previousBlock,
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
