import { Block, type AnyBlock } from "../blocks/Block"
import {
  LogicComparisonOperator,
  LogicJunctionMode,
  type BlockDataByType,
  type BlockDataExpression,
} from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import { DataType } from "../blocks/configuration/DataType"
import { DefinedExpression } from "../blocks/configuration/DefinedExpression"
import type { Connector } from "../connections/Connector"
import { ConnectorRole } from "../connections/ConnectorRole"
import { ConnectorType } from "../connections/ConnectorType"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import type {
  AnyBlockConnected,
  AnyBlockSingle,
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
  if (!data.initialDrawerBlocks) return // may be undefined if hideDrawer is true
  for (const block of data.initialDrawerBlocks) {
    blockRegistry.attachToDrawer(
      parseBlockRecursive(block, null, blockRegistry, connectorRegistry),
      block.count ?? -1
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
  data: AnyBlockConnected | AnyBlockSingle,
  parseConnected:
    | ({
        on: MixedContentEditorConnector
      } & MixedContentEditorBlock)[]
    | undefined
    | null,
  blockRegistry: BlockRegistry,
  connectorRegistry: ConnectorRegistry
): AnyBlock {
  // parse connected blocks on each specified connector
  const connectedBlocks: { connector: Connector; connected: AnyBlock }[] = []
  if (parseConnected) {
    for (const connectedBlock of parseConnected) {
      connectedBlocks.push({
        connector: parseDefaultConnector(data.type, connectedBlock.on),
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
  const blockData = normalizeBlockData(type, data.data as BlockDataByType<typeof type> | undefined)

  // add a false branch connector if elsebranch is set to true
  const defaultConnectors = DefaultConnectors.byBlockType(type, (blockData as BlockDataExpression | null)?.expression)
  if (type == BlockType.Conditional && "elsebranch" in data && data["elsebranch"] == true) {
    defaultConnectors.push(DefaultConnectors.conditionalFalse())
  }

  return new Block<typeof type>(
    type,
    blockData,
    mergeConnectors(connectedBlocks, defaultConnectors),
    data.draggable !== false,
    blockRegistry,
    connectorRegistry
  )
}

function normalizeBlockData(
  type: BlockType,
  data: BlockDataByType<typeof type> | undefined
): BlockDataByType<typeof type> {
  if (!data) data = {} as BlockDataByType<typeof type>
  switch (type) {
    case BlockType.Expression:
      if ((data as BlockDataExpression).expression == DefinedExpression.Custom) {
        // deep copy custom expression
        ;(data as BlockDataExpression).customExpression = new Map(
          Object.entries((data as BlockDataExpression).customExpression as object)
        )
      }
      break
    case BlockType.VarInit:
      // default value for mutable
      ;(data as BlockDataByType<BlockType.VarInit>).mutable =
        (data as BlockDataByType<BlockType.VarInit>).mutable ?? true
      break
    case BlockType.LogicNot:
    case BlockType.LogicJunction:
    case BlockType.LogicComparison:
      // set type to boolean for compatibility with values
      ;(data as any).type = DataType.Boolean
      if (type == BlockType.LogicJunction) {
        // default mode for junction
        ;(data as BlockDataByType<BlockType.LogicJunction>).mode =
          (data as any)?.mode ?? LogicJunctionMode.And
      }
      if (type == BlockType.LogicComparison) {
        // default mode for comparison
        ;(data as BlockDataByType<BlockType.LogicComparison>).mode =
          (data as any)?.mode ?? LogicComparisonOperator.Equal
      }
  }
  return data
}

function parseDefaultConnector(
  blockType: AnyBlockConnected["type"],
  connectorType: MixedContentEditorConnector
): Connector {
  switch (connectorType) {
    case "before":
      return DefaultConnectors.before()
    case "after":
      return DefaultConnectors.after()
    case "input":
      if (blockType == "variable_init") return DefaultConnectors.variableInitInput()
      if (blockType == "variable_set") return DefaultConnectors.variableSetInput()
      return DefaultConnectors.inputExtension()
    case "conditional":
      return DefaultConnectors.conditionalExtension()
    case "conditionalInput":
      return DefaultConnectors.conditionalInput()
    case "comparisonInput":
      return DefaultConnectors.comparisonInput()
    case "output":
      return DefaultConnectors.output()
    case "inner":
      if (blockType == "variable_set") return DefaultConnectors.innerVariable()
      return DefaultConnectors.inner()
    case "extender":
      return DefaultConnectors.extender()
    case "ifTrue":
      return DefaultConnectors.conditionalTrue()
    case "ifFalse":
      return DefaultConnectors.conditionalFalse()
  }
}

function parseBlockType(typeName: string): BlockType {
  const key = Object.values(BlockType).find(
    it => it.toLowerCase() == typeName.toLowerCase()
  ) as BlockType
  if (!key) throw new Error(`Block type not found for value: ${typeName}`)
  return key
}

function mergeConnectors(
  incoming: { connector: Connector; connected?: AnyBlock | undefined }[],
  existing: Connector[]
): { connector: Connector; connected?: AnyBlock | undefined }[] {
  const combined = [...incoming]
  existing.forEach(connector => {
    const matchingIncomingIndex = incoming.findIndex(
      it => it.connector.type === connector.type && it.connector.role === connector.role
    )
    if (matchingIncomingIndex == -1) {
      combined.unshift({ connector, connected: undefined })
    } else {
      incoming.splice(matchingIncomingIndex, 1)
    }
  })

  const typeOrder = Object.values(ConnectorType)
  const roleOrder = Object.values(ConnectorRole)
  combined.sort((a, b) => {
    const typeComparison = typeOrder.indexOf(a.connector.type) - typeOrder.indexOf(b.connector.type)
    if (typeComparison !== 0) return typeComparison
    return roleOrder.indexOf(a.connector.role) - roleOrder.indexOf(b.connector.role)
  })

  return combined
}
