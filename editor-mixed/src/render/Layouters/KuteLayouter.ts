import type { AnyBlock } from "../../blocks/Block"
import type {
  BlockDataExpression,
  BlockDataFunction,
  BlockDataValue,
  BlockDataVariable,
} from "../../blocks/configuration/BlockData"
import { BlockType } from "../../blocks/configuration/BlockType"
import { DataType } from "../../blocks/configuration/DataType"
import { Connector } from "../../connections/Connector"
import { ConnectorRole } from "../../connections/ConnectorRole"
import { ConnectorType } from "../../connections/ConnectorType"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import { HeightProp, SizeProps, WidthProp } from "../SizeProps"
import { BaseLayouter } from "./BaseLayouter"

const MIN_HEIGHT = 50
const DEFAULT_HEAD_HEIGHT = 50
const DEFAULT_TAIL_HEIGHT = 25
const DEFAULT_CONNECTOR_HEIGHT = 40
const DEFAULT_INNER_HEIGHT = 60
const DEFAULT_INTERMEDIATE_HEIGHT = 15
const MIN_WIDTH = 100
const INNER_WIDTH = 86
const PADDING_X = 4
const PADDING_Y = 4
const PADDING_Y_LOOP_END = 3
const PADDING_Y_CONDITIONAL_END = 3
const PADDING_Y_FUNCTION_END = 0
const PADDING_X_CONNECTOR = 14

export class KuteLayouter extends BaseLayouter {
  // todo this class desperately needs refactoring

  measureBlock(block: AnyBlock): SizeProps {
    const size = SizeProps.empty()

    if (block.connectors.inputExtensions.length > 0) {
      if (block.type == BlockType.VarSet) {
        size.addHeight(HeightProp.Head, 6)
      } else {
        block.connectors.inputExtensions.map((connector, index) => {
          const connected = block.connectedBlocks.byConnector(connector)
          if (connected != null) {
            size.addHeight(
              HeightProp.Head,
              this.blockRegistry.getSize(connected).fullHeight +
                (index + 1 != block.connectors.inputExtensions.length ? PADDING_Y : 0)
            )
          } else {
            size.addHeight(HeightProp.Head, DEFAULT_CONNECTOR_HEIGHT)
          }
        })
      }
    } else if (block.type == BlockType.Expression && (block.data as BlockDataExpression).editable) {
      const customExpression = (block.data as BlockDataExpression).customExpression?.get("kt")
      const lines = customExpression?.split("\n") ?? []
      size.addHeight(HeightProp.Head, Math.max(lines.length * 20, 60))
      size.addWidth(WidthProp.Left, 200)
    } else {
      size.addHeight(HeightProp.Head, DEFAULT_HEAD_HEIGHT)
    }

    const insets = block.connectors.inners.filter(it => it.role != ConnectorRole.Input)
    if (insets.length > 0) {
      size.addWidth(WidthProp.Right, INNER_WIDTH)
      insets.map((connector, index) => {
        const connected = block.connectedBlocks.byConnector(connector)
        if (connected != null) {
          size.addHeight(HeightProp.Body, this.getMeasuredStackHeight(connected))
        } else {
          size.addHeight(HeightProp.Body, DEFAULT_INNER_HEIGHT)
        }
        if (index < insets.length - 1)
          size.addHeight(HeightProp.Intermediate, DEFAULT_INTERMEDIATE_HEIGHT)
      })
    } else if (
      block.type == BlockType.Value
    ) {
      size.addWidth(WidthProp.Left, 150)
    } else if (block.type == BlockType.VarInit) {
      size.addWidth(WidthProp.Right, 200)
    } else if (block.type == BlockType.VarSet) {
      const connectedInner = block.connectedBlocks.byConnector(block.connectors.inners[0])
      const innerSize = connectedInner ? this.blockRegistry.getSize(connectedInner) : null
      size.addWidth(WidthProp.Left, 24)
      size.addWidth(WidthProp.Middle, (innerSize?.fullWidth ?? MIN_WIDTH * 0.6) + 2 * PADDING_X)
      size.addWidth(WidthProp.Right, 24)
      size.addHeight(HeightProp.CutRow, (innerSize?.fullHeight ?? MIN_HEIGHT) + 2 * PADDING_Y)
      size.addHeight(HeightProp.Tail, 6)
    }

    if (block.type == BlockType.Variable) {
      size.addWidth(WidthProp.Left, (block.data as BlockDataVariable).name.length * 7.9 + 12)
    } else if (block.type == BlockType.Function) {
      size.addWidth(WidthProp.Left, MIN_WIDTH - INNER_WIDTH)
      const fname = (block.data as BlockDataFunction).name
      if (fname.length > 5) size.addWidth(WidthProp.Right, (fname.length - 5) * 7.9)
    } else if (block.type == BlockType.VarSet) {
      // widths were set above
    } else if (size.fullWidth < MIN_WIDTH) size.addWidth(WidthProp.Left, MIN_WIDTH - size.fullWidth)

    const fullHeight = size.fullHeight
    if (block.connectors.outputExtension) {
      if (block.output)
        size.addHeight(HeightProp.Tail, this.blockRegistry.getSize(block.output).fullHeight)
      else size.addHeight(HeightProp.Tail, DEFAULT_CONNECTOR_HEIGHT)
    } else if (insets.length > 0) {
      size.addHeight(HeightProp.Tail, DEFAULT_TAIL_HEIGHT)
    } else if (block.type == BlockType.VarInit) {
      size.addHeight(HeightProp.Tail, DEFAULT_TAIL_HEIGHT)
    } else if (
      fullHeight < MIN_HEIGHT &&
      block.type != BlockType.Value &&
      block.type != BlockType.Variable
    )
      size.addHeight(HeightProp.Tail, Math.min(MIN_HEIGHT - fullHeight, DEFAULT_TAIL_HEIGHT))

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
      (parentConnector.type == ConnectorType.Inner &&
        parentConnector.role == ConnectorRole.Input) ||
      parentConnector.role == ConnectorRole.Conditional
    ) {
      const inputIndex = registeredParent.block.connectors.inputExtensions.indexOf(parentConnector)
      return new Coordinates(
        parentConnector.globalPosition.x + PADDING_X,
        registeredParent.globalPosition.y +
          (parentConnector.type == ConnectorType.Inner
            ? registeredParent.size!.fullHeadHeight!
            : registeredParent.size!.heads.splice(0, inputIndex).reduce((acc, h) => acc + h, 0)) +
          (parentConnector.type == ConnectorType.Inner ? 1 * PADDING_Y : 0)
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
        if (connector.role == ConnectorRole.Input) {
          // only one inner input is currently supported
          return new Coordinates(
            blockSize.leftWidth,
            blockSize.fullHeadHeight + DEFAULT_CONNECTOR_HEIGHT / 2 + PADDING_Y
          )
        }

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
              return acc + this.blockRegistry.getSize(connected).fullHeight + PADDING_Y
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
