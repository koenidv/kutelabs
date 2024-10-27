import { svg, type TemplateResult } from "lit"
import type { AnyBlock, Block } from "../../blocks/Block"
import type { Connector } from "../../connections/Connector"
import { Coordinates } from "../../util/Coordinates"
import { BaseBlockRenderer } from "./BaseBlockRenderer"
import { HeightProp, SizeProps, WidthProp } from "../SizeProps"
import { ConnectorType } from "../../connections/ConnectorType"
import { BlockType } from "../../blocks/BlockType"
import { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"

export class DebugBlockRenderer extends BaseBlockRenderer {
  protected measureBlock(block: AnyBlock): SizeProps {
    const size = SizeProps.empty()
    size.addWidth(WidthProp.Left, 100)

    size.addHeight(
      HeightProp.Head,
      block.extensions.length > 0
        ? BlockRegistry.instance.getSize(block.extensions[0]).fullHeight
        : block.type == BlockType.Input ? 30 : 50
    )

    // todo this only supports one inner connection; SizeProps needs to be updated to support an array of bodies (also heads for multiple inputs?)
    if (block.inners.length > 0)
      size.addHeight(HeightProp.Body, this.measureStackHeight(block.inners[0]))

    size.addHeight(HeightProp.Tail, 50)

    return size
  }

  private measureStackHeight(block: AnyBlock): number {
    let height = BlockRegistry.instance.getSize(block).fullHeight
    let after = block.after
    while (after != null) {
      height += BlockRegistry.instance.getSize(after).fullHeight
      after = after.after
    }
    return height
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
        if (block.type == BlockType.Input)
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

  protected renderBlockElement(
    block: AnyBlock,
    size: SizeProps,
    position: Coordinates,
    renderConnected: (block: AnyBlock) => TemplateResult<2>
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

      ${block.connectors.all.map(connector => this.renderConnector(connector, position))}
      
      ${block.after != null && renderConnected(block.after)}
  
      ${block.inners.map(inner => renderConnected(inner))}
      ${block.extensions.map(extension => renderConnected(extension))}
      
	  </g>
    `
    // todo inner blocks, extension blocks
  }

  private renderConnector(
    connector: Connector,
    blockPosition: Coordinates
  ): TemplateResult<2> {
    // console.log("Rendering connector of type", ConnectorType[connector.type], "at position", Coordinates.subtract(connector.globalPosition, )
    let color
    switch (connector.type) {
      case ConnectorType.Inner:
        color = "lightpink"
        break
      case ConnectorType.Extension:
        color = "lightblue"
        break
      case ConnectorType.Internal:
        color = "transparent"
        break
      default:
        color = "orange"
    }
    return svg`
    			<rect
				fill="${color}"
				x=${connector.globalPosition.x - blockPosition.x - 4}
				y=${connector.globalPosition.y - blockPosition.y - 4}
				width="8"
				height="8"
				stroke="black"
			/>
  `
  }
}
