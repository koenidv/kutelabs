import type { AnyBlock } from "../../blocks/Block"
import type { BlockDataExpression } from "../../blocks/BlockData"
import { BlockType } from "../../blocks/BlockType"
import { DefinedExpression } from "../../blocks/DefinedExpression"
import type { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import { HeightProp, SizeProps, WidthProp } from "../SizeProps"
import { BaseLayouter } from "./BaseLayouter"

export class DebugLayouter extends BaseLayouter {
  measureBlock(block: AnyBlock): SizeProps {
    const size = SizeProps.empty()
    size.addWidth(WidthProp.Left, this.determineWidth(block))

    size.addHeight(
      HeightProp.Head,
      block.extensions.length > 0
        ? this.blockRegistry.getSize(block.extensions[0]).fullHeight
        : block.type == BlockType.Value
          ? 30
          : 50
    )

    // todo this only supports one inner connection; SizeProps needs to be updated to support an array of bodies (also heads for multiple inputs?)
    if (block.inners.length > 0)
      size.addHeight(
        HeightProp.Body,
        this.getMeasuredStackHeight(block.inners[0])
      )

    size.addHeight(HeightProp.Tail, 50)

    return size
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
    // todo this doesn't support multiple extensions; will need to know the extension index
    if (parentConnector.type == ConnectorType.Extension) {
      return new Coordinates(
        registeredParent.globalPosition.x + registeredParent.size!.fullWidth,
        registeredParent.globalPosition.y
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
        if (block.type == BlockType.Value)
          return new Coordinates(0, blockSize.fullHeight / 2)
        else return Coordinates.zero
      case ConnectorType.After:
        return new Coordinates(0, blockSize.fullHeight)
      case ConnectorType.Inner:
        return new Coordinates(
          blockSize.fullWidth / 2,
          blockSize.heights.get(HeightProp.Head) ?? blockSize.fullHeight / 4
        )
      case ConnectorType.Extension:
        return new Coordinates(
          blockSize.fullWidth,
          (blockSize.heights.get(HeightProp.Head) ?? blockSize.fullHeight) / 2
        )
      case ConnectorType.Internal:
        return new Coordinates(0, 0)
      default:
        return Coordinates.zero
    }
  }
}
