import type { AnyBlock } from "../../blocks/Block"
import type { BlockDataExpression } from "../../blocks/configuration/BlockData"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { Connector } from "../../connections/Connector"
import { ConnectorRole } from "../../connections/ConnectorRole"
import { ConnectorType } from "../../connections/ConnectorType"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import { HeightProp, SizeProps, WidthProp } from "../SizeProps"
import { BaseLayouter } from "./BaseLayouter"

const MIN_HEIGHT = 100
const DEFAULT_HEAD_HEIGHT = 50
const DEFAULT_TAIL_HEIGHT = 30
const DEFAULT_CONNECTOR_HEIGHT = 40
const DEFAULT_INNER_HEIGHT = 60
const DEFAULT_INTERMEDIATE_HEIGHT = 15

export class DebugLayouter extends BaseLayouter {
  measureBlock(block: AnyBlock): SizeProps {
    const size = SizeProps.empty()
    size.addWidth(WidthProp.Left, this.determineWidth(block))

    if (block.connectors.inputExtensions.length > 0) {
      block.connectors.inputExtensions.map(connector => {
        const connected = block.connectedBlocks.byConnector(connector)
        if (connected != null) {
          size.addHeight(HeightProp.Head, this.blockRegistry.getSize(connected).fullHeight)
        } else {
          size.addHeight(HeightProp.Head, DEFAULT_CONNECTOR_HEIGHT)
        }
      })
    } else {
      size.addHeight(HeightProp.Head, DEFAULT_HEAD_HEIGHT)
    }

    const inners = block.connectors.inners
    if (inners.length > 0)
      inners.map((connector, index) => {
        const connected = block.connectedBlocks.byConnector(connector)
        if (connected != null) {
          size.addHeight(HeightProp.Body, this.getMeasuredStackHeight(connected))
        } else {
          size.addHeight(HeightProp.Body, DEFAULT_INNER_HEIGHT)
        }
        if (index < inners.length - 1)
          size.addHeight(HeightProp.Intermediate, DEFAULT_INTERMEDIATE_HEIGHT)
      })

    const fullHeight = size.fullHeight
    if (block.connectors.outputExtension) {
      if (block.output)
        size.addHeight(HeightProp.Tail, this.blockRegistry.getSize(block.output).fullHeight)
      else size.addHeight(HeightProp.Tail, DEFAULT_CONNECTOR_HEIGHT)
    } else if (inners.length > 0) {
      size.addHeight(HeightProp.Tail, DEFAULT_TAIL_HEIGHT)
    } else if (
      fullHeight < MIN_HEIGHT &&
      block.type != BlockType.Value &&
      block.type != BlockType.Variable
    )
      size.addHeight(HeightProp.Tail, Math.max(MIN_HEIGHT - fullHeight, DEFAULT_TAIL_HEIGHT))

    return size
  }

  protected determineWidth(block: AnyBlock): number {
    if (block.type == BlockType.Expression && (block.data as BlockDataExpression).editable)
      return 250
    else return 100
  }

  protected calculateBlockPosition(
    _block: AnyBlock,
    _size: SizeProps,
    registeredParent: AnyRegisteredBlock,
    parentConnector: Connector
  ): Coordinates {
    if (
      parentConnector.type == ConnectorType.Extension &&
      parentConnector.role == ConnectorRole.Input ||
      parentConnector.role == ConnectorRole.Conditional
    ) {
      const inputIndex = registeredParent.block.connectors.inputExtensions.indexOf(parentConnector)
      return new Coordinates(
        parentConnector.globalPosition.x,
        registeredParent.globalPosition.y +
          registeredParent.size!.heads.splice(0, inputIndex).reduce((acc, h) => acc + h, 0)
      )
    }
    if (parentConnector.role == ConnectorRole.Output) {
      return new Coordinates(
        parentConnector.globalPosition.x,
        registeredParent.globalPosition.y +
          registeredParent.size!.tails.reduce(
            (acc, cur) => acc - cur,
            registeredParent.size!.fullHeight
          )
      )
    }

    return parentConnector.globalPosition
  }

  protected calculateConnectorOffset(
    connector: Connector,
    block: AnyBlock,
    _blockPosition: Coordinates,
    blockSize: SizeProps
  ): Coordinates {
    switch (connector.type) {
      case ConnectorType.Before:
        if (connector.role == ConnectorRole.Input)
          return new Coordinates(0, DEFAULT_CONNECTOR_HEIGHT / 2)
        else return Coordinates.zero

      case ConnectorType.After:
        return new Coordinates(0, blockSize.fullHeight)

      case ConnectorType.Inner: {
        const index = block.connectors.inners.indexOf(connector)
        let bodiesCount = 0
        const xOffset = blockSize.bodiesAndIntermediates.reduce((acc, sizing) => {
          if (bodiesCount == index) {
            if (sizing.prop == HeightProp.Intermediate) acc += DEFAULT_INTERMEDIATE_HEIGHT
            bodiesCount++
          }
          if (bodiesCount > index) return acc
          if (sizing.prop == HeightProp.Body) bodiesCount++
          return acc + sizing.value
        }, 0)

        return new Coordinates(blockSize.fullWidth / 4, blockSize.fullHeadHeight + xOffset)
      }

      case ConnectorType.Extension: {
        if (connector.role == ConnectorRole.Output) {
          // we can expect blocks to have a maximum of one output connector
          return new Coordinates(
            blockSize.fullWidth,
            blockSize.tails.reduce((acc, cur) => acc - cur, blockSize.fullHeight) +
              DEFAULT_CONNECTOR_HEIGHT / 2
          )
        }
        const index = block.connectors.inputExtensions.indexOf(connector)

        const previousHeights = block.connectors.inputExtensions
          .slice(0, index)
          .reduce((acc, connector) => {
            const connected = block.connectedBlocks.byConnector(connector)
            if (connected != null) {
              return acc + this.blockRegistry.getSize(connected).fullHeight
            } else {
              return acc + DEFAULT_CONNECTOR_HEIGHT
            }
          }, 0)

        return new Coordinates(blockSize.fullWidth, previousHeights + DEFAULT_CONNECTOR_HEIGHT / 2)
      }

      case ConnectorType.Internal:
        return new Coordinates(0, 0)

      default:
        return Coordinates.zero
    }
  }
}
