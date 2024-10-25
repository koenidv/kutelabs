import { svg, type TemplateResult } from "lit"
import type { Block } from "../blocks/Block"
import type { Connector } from "../connections/Connector"
import { Coordinates } from "../util/Coordinates"
import { BaseRenderer } from "./AbstractRenderer"
import { SizeProps } from "./SizeProps"
import { ConnectorType } from "../connections/ConnectorType"
import { BlockType } from "../blocks/BlockType"

export class DebugRenderer extends BaseRenderer {
  protected measureBlock(block: Block): SizeProps {
    return SizeProps.simple(100, 100)
  }

  protected calculateBlockPosition(
    _block: Block,
    _parent: Block,
    parentConnector: Connector
  ): Coordinates {
    return parentConnector.globalPosition
  }

  protected calculateConnectorPosition(
    connector: Connector,
    blockPosition: Coordinates,
    blockSize: SizeProps
  ): Coordinates {
    const offset = this.determineConnectorOffset(connector, blockSize)
    return Coordinates.add(blockPosition, offset)
  }

  private determineConnectorOffset(
    connector: Connector,
    blockSize: SizeProps
  ): Coordinates {
    switch (connector.type) {
      case ConnectorType.Before:
        return Coordinates.zero
      case ConnectorType.After:
        return new Coordinates(0, blockSize.fullHeight)
      case ConnectorType.Inner:
        return new Coordinates(blockSize.fullWidth / 2, 25)
      case ConnectorType.Extension:
        return new Coordinates(blockSize.fullWidth, 25)
      case ConnectorType.Internal:
        return new Coordinates(0, 0)
      default:
        return Coordinates.zero
    }
  }

  protected renderBlockElement(
    block: Block,
    size: SizeProps,
    renderConnected: (block: Block) => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
    <g class="block-${BlockType[block.type]}">
      <rect
        x="0"
        y="0"
        width=${size.fullWidth}
        height=${size.fullHeight}
        fill="#fabcde"
        opacity="0.6"
        stroke="#000000aa"/>
      
      <text x="5" y="20" fill="black" style="user-select: none;">${BlockType[block.type]}</text>
      <text x="5" y="40" fill="black" style="user-select: none;">${block.id}</text>
      
      ${block.after != null && renderConnected(block.after)}
      
	  </g>
    `
  }
}

// ${if (block)}
// <svelte:self
//   block={block.inner}
//   pos={{ x: block.innerConnector?.offset.x ?? 25, y: block.innerConnector?.offset.y ?? 25 }}
//   />
