import { type AnyBlock } from "../blocks/Block"
import type {
  BlockDataExpression,
} from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import {
  createExpressionBlock,
  createFunctionBlock,
  createValueBlock,
  createVariableBlock,
} from "../blocks/DefaultBlocks"
import type { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import type {
  MixedContentEditorBlock,
  MixedContentEditorConfiguration,
  MixedContentEditorConnector,
} from "./editor"

export function applyData(
  data: MixedContentEditorConfiguration,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): void {
  applyDrawerBlocks(data, blockRegistry, connectorRegistry)
  applyWorkspaceBlocks(data, blockRegistry, connectorRegistry)
}

function applyDrawerBlocks(
  data: MixedContentEditorConfiguration,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): void {
  for (const block of data.initialDrawerBlocks) {
    blockRegistry.attachToDrawer(
      parseBlockRecursive(block, null, blockRegistry, connectorRegistry)
    )
  }
}

function applyWorkspaceBlocks(
  data: MixedContentEditorConfiguration,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): void {
  for (const { block, coordinates } of data.initialBlocks) {
    const parsed = parseBlockRecursive(
      block,
      block.connectedBlocks,
      blockRegistry,
      connectorRegistry
    )

    blockRegistry.attachToRoot(parsed, _ => Coordinates.parse(coordinates))
  }
}

function parseBlockRecursive(
  block: MixedContentEditorBlock,
  parseConnected:
    | ({
        on: MixedContentEditorConnector
      } & MixedContentEditorBlock)[]
    | undefined
    | null,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): AnyBlock {
  const connectedBlocks: { connector: Connector; connected: AnyBlock }[] = []
  if (parseConnected) {
    for (const connectedBlock of parseConnected) {
      connectedBlocks.push({
        connector: parseDefaultConnector(connectedBlock.on),
        connected: parseBlockRecursive(
          connectedBlock,
          connectedBlock.connectedBlocks,
          blockRegistry,
          connectorRegistry
        ),
      })
    }
  }

  switch (block.type) {
    case "function":
      return createFunctionBlock(
        block.data,
        connectedBlocks,
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
        block.data as BlockDataExpression,
        connectedBlocks,
        blockRegistry,
        connectorRegistry
      )
    case "value":
      return createValueBlock(
        block.data as any, // todo
        connectedBlocks,
        blockRegistry,
        connectorRegistry
      )
    case "variable":
      return createVariableBlock(
        block.data as any, // todo
        connectedBlocks,
        blockRegistry,
        connectorRegistry
      )
  }
}

function parseDefaultConnector(type: MixedContentEditorConnector): Connector {
  switch (type) {
    case "before":
      return DefaultConnectors.before()
    case "after":
      return DefaultConnectors.after()
    case "inputExtension":
      return DefaultConnectors.inputExtension()
    case "conditionalExtension":
      return DefaultConnectors.conditionalExtension()
    case "innerLoop":
      return DefaultConnectors.innerLoop()
    case "extender":
      return DefaultConnectors.extender()
  }
}

function parseBlockType(typeName: string): BlockType {
  const key = Object.keys(BlockType).find(
    it => it.toLowerCase() == typeName.toLowerCase()
  ) as keyof typeof BlockType
  if (!key) throw new Error(`Block type not found for value: ${typeName}`)
  return BlockType[key]
}
