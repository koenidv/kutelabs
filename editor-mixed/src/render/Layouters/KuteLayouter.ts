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

const MIN_HEIGHT = 60
const DEFAULT_HEAD_HEIGHT = 50
const DEFAULT_TAIL_HEIGHT = 25
const DEFAULT_CONNECTOR_HEIGHT = 40
const DEFAULT_INNER_HEIGHT = 60
const DEFAULT_INTERMEDIATE_HEIGHT = 15
const MIN_WIDTH = 100
const INNER_WIDTH = 86
const PADDING_X = 4
const PADDING_Y = 4
const PADDING_Y_LOOP_END = 4
const PADDING_Y_CONDITIONAL_END = 4
const PADDING_Y_FUNCTION_END = 0
const PADDING_X_CONNECTOR = 14

export class KuteLayouter extends BaseLayouter {
  measureBlock(block: AnyBlock): SizeProps {
    const size = SizeProps.empty()

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
    if (inners.length > 0) {
      size.addWidth(WidthProp.Right, INNER_WIDTH)
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
    }

    if (size.fullWidth < MIN_WIDTH) size.addWidth(WidthProp.Left, MIN_WIDTH - size.fullWidth)

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
      (parentConnector.type == ConnectorType.Extension &&
        parentConnector.role == ConnectorRole.Input) ||
      parentConnector.role == ConnectorRole.Conditional
    ) {
      const inputIndex = registeredParent.block.connectors.inputExtensions.indexOf(parentConnector)
      return new Coordinates(
        parentConnector.globalPosition.x + PADDING_X,
        registeredParent.globalPosition.y +
          registeredParent.size!.heads.splice(0, inputIndex).reduce((acc, h) => acc + h, 0)
      )
    }
    if (parentConnector.role == ConnectorRole.Output) {
      return new Coordinates(
        parentConnector.globalPosition.x + PADDING_X,
        registeredParent.globalPosition.y +
          registeredParent.size!.tails.reduce(
            (acc, cur) => acc - cur,
            registeredParent.size!.fullHeight
          )
      )
    }

    return parentConnector.globalPosition.add(new Coordinates(-PADDING_X_CONNECTOR, PADDING_Y))
  }

  protected override getMeasuredStackHeight(block: AnyBlock): number {
    const parentType = block.upstream?.type
    let height = this.blockRegistry.getSize(block).fullHeight + PADDING_Y
    let after = block.after
    while (after != null) {
      height += this.blockRegistry.getSize(after).fullHeight + PADDING_Y
      after = after.after
    }
    return (
      height +
      PADDING_Y +
      (parentType == BlockType.Function
        ? PADDING_Y_FUNCTION_END
        : parentType == BlockType.Conditional
          ? PADDING_Y_CONDITIONAL_END
          : PADDING_Y_LOOP_END)
    )
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
        else return new Coordinates(PADDING_X_CONNECTOR, 0)

      case ConnectorType.After:
        return new Coordinates(PADDING_X_CONNECTOR, blockSize.fullHeight)

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

        return new Coordinates(
          blockSize.leftWidth + PADDING_X + PADDING_X_CONNECTOR,
          blockSize.fullHeadHeight + xOffset
        )
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
