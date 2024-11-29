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

const DEFAULT_CONNECTOR_HEIGHT = 40

export class DebugLayouter extends BaseLayouter {
  measureBlock(block: AnyBlock): SizeProps {
    const size = SizeProps.empty()
    size.addWidth(WidthProp.Left, this.determineWidth(block))

    size.addHeight(HeightProp.Head, this.determineHeadHeight(block))

    // todo this only supports one inner connection; SizeProps needs to be updated to support an array of bodies (also heads for multiple inputs?)
    if (block.inners.length > 0)
      size.addHeight(
        HeightProp.Body,
        this.getMeasuredStackHeight(block.inners[0])
      )

    const fullHeight = size.fullHeight
    if (fullHeight < 100) size.addHeight(HeightProp.Tail, Math.max(100-fullHeight, 50))

    return size
  }

  protected determineHeadHeight(block: AnyBlock): number {
    let height = 0

    block.connectors.extensions.map(connector => {
      const connected = block.connectedBlocks.byConnector(connector)
      if (connected != null) {
        height += this.blockRegistry.getSize(connected).fullHeight
      } else {
        height += DEFAULT_CONNECTOR_HEIGHT
      }
    })

    return Math.max(height, block.type == BlockType.Value ? 30 : 50)
  }

  protected determineWidth(block: AnyBlock): number {
    if (
      block.type == BlockType.Expression &&
      (block.data as BlockDataExpression).editable
    )
      return 250
    else return 100
  }

  protected calculateBlockPosition(
    _block: AnyBlock,
    _size: SizeProps,
    registeredParent: AnyRegisteredBlock,
    parentConnector: Connector
  ): Coordinates {
    if (parentConnector.role == ConnectorRole.Input) {
      return new Coordinates(
        parentConnector.globalPosition.x,
        parentConnector.globalPosition.y - DEFAULT_CONNECTOR_HEIGHT / 2
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
      case ConnectorType.Inner:
        return new Coordinates(
          blockSize.fullWidth / 2,
          blockSize.heights.get(HeightProp.Head) ?? blockSize.fullHeight / 4
        )
      case ConnectorType.Extension:
        const index = block.connectors.extensions.indexOf(connector)

        const previousHeights = block.connectors.extensions
          .slice(0, index)
          .reduce((acc, connector) => {
            const connected = block.connectedBlocks.byConnector(connector)
            if (connected != null) {
              return acc + this.blockRegistry.getSize(connected).fullHeight
            } else {
              return acc + DEFAULT_CONNECTOR_HEIGHT
            }
          }, 0)

        return new Coordinates(
          blockSize.fullWidth,
          previousHeights + DEFAULT_CONNECTOR_HEIGHT / 2
          // (blockSize.heights.get(HeightProp.Head) ?? blockSize.fullHeight) / 2
        )
      case ConnectorType.Internal:
        return new Coordinates(0, 0)
      default:
        return Coordinates.zero
    }
  }
}
