import { html, svg, type TemplateResult } from "lit"
import { Block, type AnyBlock } from "../../blocks/Block"
import type {
  BlockDataExpression,
  BlockDataValue,
  BlockDataVariable,
} from "../../blocks/configuration/BlockData"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import { Coordinates } from "../../util/Coordinates"
import { HeightProp, SizeProps } from "../SizeProps"
import { BaseBlockRenderer } from "./BaseBlockRenderer"

import { ref } from "lit/directives/ref.js"

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
      ${block.output != null && renderConnected(block.output)}
      
	  </g>
    `
    // todo inner blocks, extension blocks
  }

  private renderBlockContainer(
    block: AnyBlock,
    size: SizeProps,
    _position: Coordinates
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
      case BlockType.VarInit:
        return svg`
          <text x="5" y="15">create var</text>
          ${this.renderInputContent(
            (block.data as BlockDataVariable<any>).name?.toString(), // todo type
            (value: string) => ((block.data as BlockDataVariable<any>).name = value),
            new Coordinates(5, 20),
            new Coordinates(size.fullWidth - 10, 20)
          )}
          <text x="5" y="55">as</text>
          ${this.renderSelectorContent(
            ["String", "Int", "Boolean", "Float"],
            (block.data as BlockDataVariable<any>).type?.toString(), // todo
            (value: string) => ((block.data as BlockDataVariable<any>).type = value),
            new Coordinates(5, 60),
            position.plus(0, size.fullHeight),
            new Coordinates(size.fullWidth - 10, 28)
          )}
        `
      case BlockType.Value:
        return this.renderInputContent(
          (block.data as BlockDataValue<any>).value?.toString(), // todo type
          (value: string) => ((block.data as BlockDataValue<any>).value = value),
          new Coordinates(5, 5),
          new Coordinates(size.fullWidth - 10, size.fullHeight - 10)
        )
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
    _block: Block<BlockType.Expression>,
    data: BlockDataExpression,
    size: SizeProps
  ): TemplateResult<2> {
    return svg`
        <foreignObject x="30" y="10" width=${size.fullWidth - 40} height=${size.fullHeight - 20} >
          ${this.tapOrDragLayer(
            reference => html`
              <prism-kotlin-editor
                ${ref(reference)}
                class="donotdrag"
                style="width: 100%; height: 100%; ${this._safariTransform}"
                .input="${data.customExpression?.get("kt") ?? ""}"
                @input-change=${(e: CustomEvent) =>
                  data.customExpression?.set(
                    data.editable ? data.editable.lang : "kt",
                    e.detail.code
                  )}>
              </prism-kotlin-editor>
            `
          )}
        </foreignObject>
        `
  }

  private renderInputContent(
    input: string,
    onInput: (value: string) => void,
    position: Coordinates,
    size: Coordinates
  ): TemplateResult<2> {
    return svg`
      <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y}>
      ${this.tapOrDragLayer(
        reference => html`
          <value-input
            ${ref(reference)}
            class="donotdrag"
            style="width: 100%; height: 100%; ${this._safariTransform}"
            .input=${input}
            @input-change=${(e: CustomEvent) => onInput(e.detail.input)}></value-input>
        `
      )}
      </foreignObject>
    `
  }

  private renderSelectorContent(
    values: string[],
    selected: string,
    onSelect: (value: string) => void,
    position: Coordinates,
    widgetPosition: Coordinates,
    size: Coordinates
  ): TemplateResult<2> {
    const showDropdown = (e: MouseEvent) => {
      e.preventDefault()
      this.setWidget(
        {
          type: "selector",
          options: values.map(value => ({ id: value, display: value })),
          selected,
          onSelected: (it: string) => {
            onSelect(it)
            return true
          },
        },
        new Coordinates(widgetPosition.x, widgetPosition.y)
      )
    }

    return svg`
      <text x=${position.x} y=${position.y + 10} fill="black" @mousedown="${(e: MouseEvent) => showDropdown(e)}">Select type</text>
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
