import { Block, type AnyBlock } from "../blocks/Block"
import type { BlockDataByType, BlockDataExpression } from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
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
    blockRegistry.attachToDrawer(parseBlockRecursive(block, null, blockRegistry, connectorRegistry))
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
  data: MixedContentEditorBlock,
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

  const type = parseBlockType(data.type)

  if (type == BlockType.Expression && (data.data as BlockDataExpression)?.editable) {
    ;(data.data as BlockDataExpression).customExpression = new Map(
      Object.entries((data.data as BlockDataExpression).customExpression as object)
    )
  }

  const defaultConnectors = DefaultConnectors.byBlockType(type)
  if (type == BlockType.Conditional && "elsebranch" in data && data["elsebranch"] == true) {
    defaultConnectors.push(DefaultConnectors.conditionalFalse())
  }

  return new Block<typeof type>(
    type,
    data.data as BlockDataByType<typeof type>,
    mergeConnectors(connectedBlocks, defaultConnectors),
    true,
    blockRegistry,
    connectorRegistry
  )
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

function mergeConnectors(
  incoming: { connector: Connector; connected?: AnyBlock | undefined }[],
  existing: Connector[]
): { connector: Connector; connected?: AnyBlock | undefined }[] {
  existing.forEach(connector => {
    if (
      !incoming.find(
        it => it.connector.type === connector.type && it.connector.role === connector.role
      )
    ) {
      incoming.push({ connector, connected: undefined })
    }
  })
  return incoming
}
