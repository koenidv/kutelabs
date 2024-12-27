import { html, svg, type TemplateResult } from "lit"
import { Block, type AnyBlock } from "../../blocks/Block"
import type {
  BlockDataExpression,
  BlockDataValue,
  BlockDataVariableInit,
} from "../../blocks/configuration/BlockData"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import { Coordinates } from "../../util/Coordinates"
import { HeightProp, SizeProps } from "../SizeProps"
import { BaseBlockRenderer, BlockMarking } from "./BaseBlockRenderer"

import { ref } from "lit/directives/ref.js"
import { DataType } from "../../blocks/configuration/DataType"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"

export class DebugBlockRenderer extends BaseBlockRenderer {
  protected renderBlockElement(
    registered: AnyRegisteredBlock,
    renderConnected: (block: AnyBlock) => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
    <g class="block-${registered.block.type}">
      ${this.renderBlockContainer(registered)}

      ${this.renderBlockContents(registered)}

      ${registered.block.connectors.all.map(connector => this.renderConnector(connector, registered.globalPosition))}
      
      ${registered.block.after != null && renderConnected(registered.block.after)}
  
      ${registered.block.inners.map(inner => renderConnected(inner))}
      ${registered.block.extensions.map(extension => renderConnected(extension))}
      ${registered.block.output != null && renderConnected(registered.block.output)}
      
	  </g>
    `
    // todo inner blocks, extension blocks
  }

  private renderBlockContainer({ block, size, marking }: AnyRegisteredBlock): TemplateResult<2>[] {
    if (!size) throw new Error("Size is not defined for " + JSON.stringify(block))
    let heightOffset = 0

    const strokeColor =
      marking == BlockMarking.Executing
        ? "#ae78fe"
        : marking == BlockMarking.Error
          ? "#FA003F"
          : "#303030"
    const strokeWidth = marking != null ? 3 : 1

    const boxes = size.heights.map(
      sizing =>
        svg`
        <rect
          x="0"
          y=${(heightOffset += sizing.value) - sizing.value}
          width=${size.fullWidth}
          height=${sizing.value}
          fill=${sizing.prop == HeightProp.Head ? "#add1eb" : sizing.prop == HeightProp.Tail ? "#f8d6c6" : sizing.prop == HeightProp.Intermediate ? "#d6d6d6" : "#fabcde"}
          opacity="0.6"
          stroke="#909090"/>
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
          stroke=${strokeColor}
          stroke-width=${strokeWidth} />
      </g>
      `
    )

    return boxes
  }

  private renderBlockContents({
    block,
    size,
    globalPosition: position,
  }: AnyRegisteredBlock): TemplateResult<2> | undefined {
    if (!size) throw new Error("Size is not defined for " + JSON.stringify(block))
    switch (block.type) {
      case BlockType.VarInit:
        const blockData = block.data as BlockDataVariableInit<any>
        return svg`
          <text x="5" y="15">create var</text>
          ${this.renderInputContent(
            blockData.name?.toString(), // todo type
            (value: string) => block.updateData(cur => ({ ...cur, name: value })),
            new Coordinates(5, 20),
            new Coordinates(size.fullWidth - 10, 20)
          )}
          <text x="5" y="55">as</text>
          ${this.renderSelectorContent(
            Object.entries(DataType).map(([display, id]) => ({ id, display })),
            blockData.type,
            (id: string) =>
              block.updateData(cur => ({ ...cur, type: id }) as BlockDataVariableInit<any>),
            new Coordinates(5, 60),
            position.plus(0, size.fullHeight),
            new Coordinates(size.fullWidth - 10, 28)
          )}
        `
      case BlockType.Value:
        return this.renderInputContent(
          (block.data as BlockDataValue<any>).value?.toString(), // todo type
          (value: string) => block.updateData(cur => ({ ...cur, value: value }) as any),
          new Coordinates(5, 5),
          new Coordinates(size.fullWidth - 10, size.fullHeight - 10)
        )
      case BlockType.Expression:
        if ((block as Block<BlockType.Expression>).data.editable)
          return this.renderEditableCodeContents(block as Block<BlockType.Expression>, size)
        else
          return svg`<text x="5" y="20" fill="black" style="user-select: none;">${(block.data as BlockDataExpression).expression}</text>`
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
                .input="${block.data.customExpression?.get("kt") ?? ""}"
                @input-change=${(e: CustomEvent) =>
                  block.updateData(cur => {
                    const expr = cur.customExpression?.set(
                      cur.editable ? cur.editable.lang : "kt",
                      e.detail.input
                    )
                    return { ...cur, customExpression: expr }
                  })}>
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
    values: { id: string; display: string }[],
    selected: string,
    onSelect: (id: string) => void,
    position: Coordinates,
    widgetPosition: Coordinates,
    size: Coordinates
  ): TemplateResult<2> {
    const showDropdown = (e: Event) => {
      e.preventDefault()
      this.setWidget(
        {
          type: "selector",
          options: values,
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
    <g 
      transform="${`translate(${position.x}, ${position.y})`}"
      role="button"
      tabindex="0" 
      style="cursor: pointer;"
      @mousedown="${(e: Event) => showDropdown(e)}"
      @touchstart="${(e: Event) => showDropdown(e)}"
      @keydown="${(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") showDropdown(e)
      }}"
      >
      <rect width=${size.x} height=${size.y} fill="white" stroke="black" stroke-width="1" />
      <text x="5" y="${size.y / 2 + 6}">${selected}</text>
      </g>
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
