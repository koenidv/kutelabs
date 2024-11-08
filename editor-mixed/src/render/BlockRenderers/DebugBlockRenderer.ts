import { svg, type TemplateResult } from "lit"
import type { AnyBlock, Block } from "../../blocks/Block"
import type { Connector } from "../../connections/Connector"
import { Coordinates } from "../../util/Coordinates"
import { BaseBlockRenderer } from "./BaseBlockRenderer"
import { SizeProps } from "../SizeProps"
import { ConnectorType } from "../../connections/ConnectorType"
import { BlockType } from "../../blocks/BlockType"
import type { BlockDataExpression } from "../../blocks/BlockData"

import "../../codeEditor/PrismKotlinEditor"

export class DebugBlockRenderer extends BaseBlockRenderer {
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

      ${this.renderBlockContents(block, size, position)}

      ${block.connectors.all.map(connector => this.renderConnector(connector, position))}
      
      ${block.after != null && renderConnected(block.after)}
  
      ${block.inners.map(inner => renderConnected(inner))}
      ${block.extensions.map(extension => renderConnected(extension))}
      
	  </g>
    `
    // todo inner blocks, extension blocks
  }

  private renderBlockContents(
    block: AnyBlock,
    size: SizeProps,
    position: Coordinates
  ): TemplateResult<2> | undefined {
    switch (block.type) {
      case BlockType.Expression:
        if ((block as Block<BlockType.Expression>).data.editable)
          return this.renderEditableCodeContents(
            block,
            block.data as BlockDataExpression,
            size
          )
        else break
      default:
        return svg`
          <text x="5" y="20" fill="black" style="user-select: none;">${BlockType[block.type]}</text>
          <text x="5" y="40" fill="black" style="user-select: none;">${block.id}</text>
        `
    }
  }

  private renderEditableCodeContents(
    block: Block<BlockType.Expression>,
    data: BlockDataExpression,
    size: SizeProps
  ): TemplateResult<2> {
    return svg`
          <rect
        x="0"
        y="0"
        width=${size.fullWidth / 2}
        height=${size.fullHeight / 2}
        fill="#badeff"
        opacity="0.6"
        stroke="#000000aa"/>
        <foreignObject class="donotdrag" x="0" y="0" width=${size.fullWidth} height=${size.fullHeight} >
          <!-- <lit-code code='val test = "dongs"' language="kotlin"></lit-code> -->
          <prism-kotlin-editor
            .input="${data.customExpression || ""}"
            style="width: 100%; height: 100%;">
          </prism-lit-editor>

        </foreignObject>
        `
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
