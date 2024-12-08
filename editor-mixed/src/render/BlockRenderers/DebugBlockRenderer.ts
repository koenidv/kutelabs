import { svg, type TemplateResult } from "lit"
import type { AnyBlock, Block } from "../../blocks/Block"
import type { Connector } from "../../connections/Connector"
import { Coordinates } from "../../util/Coordinates"
import { BaseBlockRenderer } from "./BaseBlockRenderer"
import { HeightProp, SizeProps } from "../SizeProps"
import { ConnectorType } from "../../connections/ConnectorType"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { BlockDataExpression } from "../../blocks/configuration/BlockData"

import "../../codeEditor/PrismKotlinEditor"
import { isSafari } from "../../util/browserCheck"

export class DebugBlockRenderer extends BaseBlockRenderer {
  protected renderBlockElement(
    block: AnyBlock,
    size: SizeProps,
    position: Coordinates,
    renderConnected: (block: AnyBlock) => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
    <g class="block-${block.type}">
      ${this.renderBlockContainer(block, size, position)}

      ${this.renderBlockContents(block, size, position)}

      ${block.connectors.all.map(connector => this.renderConnector(connector, position))}
      
      ${block.after != null && renderConnected(block.after)}
  
      ${block.inners.map(inner => renderConnected(inner))}
      ${block.extensions.map(extension => renderConnected(extension))}
      
	  </g>
    `
    // todo inner blocks, extension blocks
  }

  private renderBlockContainer(
    block: AnyBlock,
    size: SizeProps,
    position: Coordinates
  ): TemplateResult<2>[] {
    let heightOffset = 0

    const boxes = size.heights.map(
      sizing =>
        svg`
      <g class="block-${block.type}">
        <rect
          x="0"
          y=${(heightOffset += sizing.value) - sizing.value}
          width=${size.fullWidth}
          height=${sizing.value}
          fill=${sizing.prop == HeightProp.Head ? "#add1eb" : sizing.prop == HeightProp.Tail ? "#f8d6c6" : sizing.prop == HeightProp.Intermediate ? "#d6d6d6" : "#fabcde"}
          opacity="0.6"
          stroke="#909090"/>
      </g>
      `
    )

    boxes.push(
      svg`
      <g class="block-${block.type}">
        <rect
          x="0"
          y="0"
          width=${size.fullWidth}
          height=${size.fullHeight}
          fill="transparent"
          stroke="#303030"/>
      </g>
      `
    )

    return boxes
  }

  private renderBlockContents(
    block: AnyBlock,
    size: SizeProps,
    position: Coordinates
  ): TemplateResult<2> | undefined {
    switch (block.type) {
      case BlockType.Expression:
        if ((block as Block<BlockType.Expression>).data.editable)
          return this.renderEditableCodeContents(block, block.data as BlockDataExpression, size)
        else break
      default:
        return svg`
          <text x="5" y="20" fill="black" style="user-select: none;">${block.type}</text>
          ${
            block.data !== null &&
            svg`<text x="5" y="40" width=${size.fullWidth} fill="black" style="user-select: none; opacity: 0.6;">${JSON.stringify(block.data)}</text>`
          }
        `
    }
  }

  private renderEditableCodeContents(
    block: Block<BlockType.Expression>,
    data: BlockDataExpression,
    size: SizeProps
  ): TemplateResult<2> {
    const safariTransform = isSafari
      ? `position: fixed; transform: scale(${1 / this._workspaceScaleFactor}); transform-origin: 0 0;`
      : ""
    return svg`
        <foreignObject class="donotdrag" x="30" y="10" width=${size.fullWidth - 40} height=${size.fullHeight - 20} >
          <prism-kotlin-editor
            .input="${data.customExpression?.get("kt") ?? ""}"
            style="width: 100%; height: 100%; ${safariTransform}" 
            @code-change=${(e: CustomEvent) => data.customExpression?.set(data.editable ? data.editable.lang : "kt", e.detail.code)}
          />

        </foreignObject>
        `
  }

  private renderConnector(connector: Connector, blockPosition: Coordinates): TemplateResult<2> {
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
