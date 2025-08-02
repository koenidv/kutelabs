import type { AnyBlock } from "../../blocks/Block"
import type {
  BlockDataComment,
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

const MIN_HEIGHT = 48
const DEFAULT_HEAD_HEIGHT = 48
const DEFAULT_TAIL_HEIGHT = 16
const DEFAULT_CONNECTOR_HEIGHT = 48
const DEFAULT_INNER_HEIGHT = 64
const DEFAULT_INTERMEDIATE_HEIGHT = 16
const BLOCK_PADDING_LEFT = 16
const BLOCK_PADDING_RIGHT = 16
const FUNCTION_PARAM_HEIGHT = 36
const FUNCTION_PARAM_WIDTH = 120
const MIN_WIDTH = 112
const VALUE_WIDTH = 144
const VARINIT_WIDTH = 208
const VAR_DEFAULT_WIDTH = 80
const PADDING_X = 16
const PADDING_Y = 16
const PADDING_Y_LOOP_END = 8
const PADDING_Y_CONDITIONAL_END = 3
const PADDING_Y_FUNCTION_END = 0
const PADDING_X_CONNECTOR = 16
const EXTENSION_CONDITION_LEFT = 96

const PADDING_LR = BLOCK_PADDING_LEFT + BLOCK_PADDING_RIGHT

export class NeoLayouter extends BaseLayouter {
  // todo this class desperately needs refactoring

  measureBlock(block: AnyBlock): SizeProps {
    const size = SizeProps.empty()

    if (block.connectors.inputExtensions.length > 0) {
      if (block.type == BlockType.VarSet || block.type == BlockType.Conditional) {
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

    /*
     * Function params & name
     */

    if (block.type == BlockType.Function) {
      const data = block.data as BlockDataFunction

      if (data.params.length > 0 || (data.paramsEditable ?? !data.isMain)) {
        data.params.map(() => size.addHeight(HeightProp.Head, FUNCTION_PARAM_HEIGHT))
        if (data.paramsEditable ?? !data.isMain)
          size.addHeight(HeightProp.Head, FUNCTION_PARAM_HEIGHT)
        size.addHeight(HeightProp.Head, PADDING_Y)

        if (size.fullWidth < FUNCTION_PARAM_WIDTH + PADDING_LR) {
          size.addWidth(WidthProp.Middle, FUNCTION_PARAM_WIDTH - size.fullWidth + PADDING_LR)
        }
      }

      const fname = (block.data as BlockDataFunction).name.slice(0, 30)
      if (fname.length > 8) {
        size.addWidth(WidthProp.Right, Math.ceil(((fname.length - 8) * 7.9) / 16) * 16)
      }
    }

    /*
     * Conditional block extension
     */
    if (block.type == BlockType.Conditional) {
      const extension = block.conditional
      const extensionWidth = extension
        ? this.getMeasuredWidth(extension) - PADDING_X
        : VAR_DEFAULT_WIDTH
      const height = extension ? this.getMeasuredStackHeight(extension) - 2 * PADDING_Y : MIN_HEIGHT

      size.addWidth(WidthProp.Middle, EXTENSION_CONDITION_LEFT - BLOCK_PADDING_LEFT)
      size.addWidth(WidthProp.Right, extensionWidth)
      size.addHeight(HeightProp.Head, height + PADDING_Y)
      size.addZone({
        x: EXTENSION_CONDITION_LEFT,
        y: BLOCK_PADDING_RIGHT / 2,
        width: extensionWidth,
        height: height,
      })
    }

    /*
     * Inner connected blocks
     */

    const insets = block.connectors.inners.filter(it => it.role != ConnectorRole.Input)
    if (insets.length > 0) {
      size.addWidth(WidthProp.Left, BLOCK_PADDING_LEFT)
      size.addWidth(WidthProp.Right, BLOCK_PADDING_RIGHT)
      insets.map((connector, index) => {
        const connected = block.connectedBlocks.byConnector(connector)
        const height = connected ? this.getMeasuredStackHeight(connected) : DEFAULT_INNER_HEIGHT
        let width = connected == null ? MIN_WIDTH : this.getMeasuredWidth(connected, true)
        if (block.type != BlockType.Function) width += PADDING_X

        size.addZone({
          x: size.leftWidth,
          y: size.fullHeight,
          width: Math.max(width, size.fullWidth - PADDING_LR),
          height: height,
        })
        size.addHeight(HeightProp.Body, height)
        if (size.fullWidth < width + PADDING_LR) {
          size.addWidth(WidthProp.Middle, width - size.fullWidth + PADDING_LR)
        }
        if (index < insets.length - 1) {
          size.addHeight(HeightProp.Intermediate, DEFAULT_INTERMEDIATE_HEIGHT)
        }
      })
    }

    /*
     * VARSET block
     */

    if (block.type == BlockType.VarSet) {
      const connectedInner = block.connectedBlocks.byConnector(block.connectors.inners[0])
      const innerSize = connectedInner ? this.blockRegistry.getSize(connectedInner) : null
      const innerHeight = (innerSize?.fullHeight ?? MIN_HEIGHT) + 2 * PADDING_Y

      const inputHeight =
        block.connectedBlocks
          .byConnector(block.connectors.inputExtensions[0] ?? null)
          ?.let(connected => this.blockRegistry.getSize(connected).fullHeight) ??
        DEFAULT_CONNECTOR_HEIGHT

      size.addWidth(WidthProp.Left, BLOCK_PADDING_LEFT)
      size.addWidth(WidthProp.Middle, (innerSize?.fullWidth ?? VAR_DEFAULT_WIDTH) + 2 * PADDING_X)
      size.addWidth(WidthProp.Right, BLOCK_PADDING_RIGHT)
      size.addHeight(HeightProp.Head, 6 + Math.max(0, (inputHeight - innerHeight - 12) / 2))
      size.addHeight(HeightProp.CutRow, innerHeight)
      size.addHeight(HeightProp.Tail, 6 + Math.max(0, (inputHeight - innerHeight - 12) / 2))

      size.addZone({
        x: size.leftWidth,
        y: size.fullHeadHeight,
        width: (innerSize?.fullWidth ?? VAR_DEFAULT_WIDTH) + 2 * PADDING_X,
        height: innerHeight,
      })
    }

    /*
     * Sizes per regular block type
     */

    switch (block.type) {
      case BlockType.Value:
        if ((block.data as BlockDataValue<any>).type == DataType.Boolean)
          size.addWidth(WidthProp.Left, MIN_WIDTH)
        else size.addWidth(WidthProp.Left, VALUE_WIDTH)
        break
      case BlockType.Variable:
        size.addWidth(
          WidthProp.Left,
          Math.round(((block.data as BlockDataVariable).name.length * 7.9 + 12) / 16) * 16
        )
        break
      case BlockType.VarInit:
        size.addWidth(WidthProp.Right, VARINIT_WIDTH)
        size.addHeight(HeightProp.Tail, DEFAULT_TAIL_HEIGHT)
        break
      case BlockType.Comment:
        size.addWidth(
          WidthProp.Left,
          Math.round(((block.data as BlockDataComment).value.length * 7.9 + 8) / 16) * 16
        )
        break
      default:
        if (size.fullWidth < MIN_WIDTH) {
          size.addWidth(WidthProp.Middle, MIN_WIDTH - size.fullWidth)
        }
    }

    const fullHeight = size.fullHeight
    if (block.connectors.outputExtension) {
      if (block.output)
        size.addHeight(HeightProp.Tail, this.blockRegistry.getSize(block.output).fullHeight)
      else size.addHeight(HeightProp.Tail, DEFAULT_CONNECTOR_HEIGHT)
    } else if (insets.length > 0) {
      size.addHeight(HeightProp.Tail, DEFAULT_TAIL_HEIGHT)
    } else if (
      fullHeight < MIN_HEIGHT &&
      block.type != BlockType.Value &&
      block.type != BlockType.Variable
    ) {
      size.addHeight(HeightProp.Tail, Math.min(MIN_HEIGHT - fullHeight, DEFAULT_TAIL_HEIGHT))
    }

    return size
  }

  protected calculateBlockPosition(
    _block: AnyBlock,
    _size: SizeProps,
    registeredParent: AnyRegisteredBlock,
    parentConnector: Connector
  ): Coordinates {
    if (parentConnector.role == ConnectorRole.Conditional) {
      return new Coordinates(
        parentConnector.globalPosition.x,
        registeredParent.globalPosition.y + BLOCK_PADDING_RIGHT / 2 - 2
      )
    }
    if (
      (parentConnector.type == ConnectorType.Extension &&
        parentConnector.role == ConnectorRole.Input) ||
      (parentConnector.type == ConnectorType.Inner && parentConnector.role == ConnectorRole.Input)
    ) {
      const inputIndex = registeredParent.block.connectors.inputExtensions.indexOf(parentConnector)
      return new Coordinates(
        parentConnector.globalPosition.x + PADDING_X,
        registeredParent.globalPosition.y +
          (parentConnector.type == ConnectorType.Inner
            ? registeredParent.size!.fullHeadHeight! - 2
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

    if (parentConnector.type == ConnectorType.Inner) {
      const inFun = parentConnector.parentBlock?.type == BlockType.Function
      return parentConnector.globalPosition.add(
        new Coordinates(inFun ? -PADDING_X_CONNECTOR : 0, inFun ? 0 : PADDING_Y)
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

  protected getMeasuredWidth(block: AnyBlock, includingPlaceholders: boolean = true): number {
    const width = this.blockRegistry.getSize(block).fullWidth + PADDING_X
    let inputs = block.inputs
    let maxInputWidth = 0
    for (const input of inputs) {
      const inputWidth =
        input !== null
          ? this.getMeasuredWidth(input, includingPlaceholders)
          : includingPlaceholders
            ? MIN_WIDTH
            : 0
      if (inputWidth > maxInputWidth) maxInputWidth = inputWidth
    }
    const downstreamWidth = block.downstreamWithConnectors.reduce(
      (acc, { block: connectedBlock }) => {
        const connectedSize = this.getMeasuredWidth(connectedBlock, includingPlaceholders)
        return Math.max(acc, connectedSize)
      },
      0
    )
    return Math.max(width + maxInputWidth, downstreamWidth)
  }

  
  protected calculateConnectorOffset(
    connector: Connector,
    block: AnyBlock,
    _blockPosition: Coordinates,
    blockSize: SizeProps
  ): Coordinates {
    // fixme the -2 offset accumulates
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
            blockSize.leftWidth - 2,
            blockSize.fullHeadHeight + DEFAULT_CONNECTOR_HEIGHT / 2 + PADDING_Y - 2
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
          blockSize.leftWidth + PADDING_X_CONNECTOR - 2,
          blockSize.fullHeadHeight + xOffset - 2
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

        if (connector.role == ConnectorRole.Conditional) {
          // for if/else blocks
          return new Coordinates(EXTENSION_CONDITION_LEFT, PADDING_Y + BLOCK_PADDING_RIGHT / 2)
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
