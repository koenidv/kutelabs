import { html, svg, type TemplateResult } from "lit"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import { Coordinates } from "../../util/Coordinates"
import { HeightProp } from "../SizeProps"
import { BaseBlockRenderer, BlockMarking, type SvgResult } from "./BaseBlockRenderer"

import { ref } from "lit/directives/ref.js"
import { DataType } from "../../blocks/configuration/DataType"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"

export class DebugBlockRenderer extends BaseBlockRenderer {
  protected renderContainer({
    block,
    size,
    globalPosition,
    marking,
  }: AnyRegisteredBlock): TemplateResult<2>[] {
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

    boxes.push(
      ...block.connectors.all.map(connector => this.renderConnector(connector, globalPosition))
    )

    return boxes
  }

  protected renderDefaultContent({ block, size }: AnyRegisteredBlock): SvgResult {
    return svg`
          <text x="5" y="20" fill="black" style="user-select: none;">${block.type}</text>
          ${
            block.data !== null &&
            svg`<text x="5" y="40" width=${size.fullWidth} fill="black" style="user-select: none; opacity: 0.6;">${JSON.stringify(block.data)}</text>`
          }
        `
  }

  protected override renderContentVariableInit(
    registered: RegisteredBlock<BlockType.VarInit, any>
  ): SvgResult {
    const { block, size, globalPosition: position } = registered
    return svg`
          <text x="5" y="15">create var</text>
          ${this.renderInput(
            registered,
            new Coordinates(5, 20),
            new Coordinates(size.fullWidth - 10, 20),
            block.data.name?.toString(), // todo type
            (value: string) => block.updateData(cur => ({ ...cur, name: value }))
          )}
          <text x="5" y="55">as</text>
          ${this.renderSelector(
            registered,
            new Coordinates(5, 60),
            new Coordinates(size.fullWidth - 10, 28),
            position.plus(0, size.fullHeight),
            Object.entries(DataType).map(([display, id]) => ({ id, display })),
            block.data.type,
            (id: string) => block.updateData(cur => ({ ...cur, type: id }))
          )}
        `
  }

  protected override renderContentValue(
    registered: RegisteredBlock<BlockType.Value, any>
  ): SvgResult {
    const { block, size } = registered
    return this.renderInput(
      registered,
      new Coordinates(5, 5),
      new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
      block.data.value?.toString(), // todo type
      (value: string) => block.updateData(cur => ({ ...cur, value: value }))
    )
  }

  protected override renderContentExpression(
    registered: RegisteredBlock<BlockType.Expression, any>
  ): SvgResult {
    if (registered.block.data.editable)
      return [this.editableCode(
        registered,
        new Coordinates(30, 10),
        new Coordinates(registered.size.fullWidth - 40, registered.size.fullHeight - 20)
      ),
    svg`
      <text fill="white" x=${registered.size.fullWidth - 15} y=${registered.size.fullHeight - 15} text-anchor="end">${registered.block.data.editable?.lang ?? "unset (kt)"}</text>
      `
    ]
    else
      return svg`<text x="5" y="20" fill="black" style="user-select: none;">${registered.block.data.expression}</text>`
  }

  protected renderEditableCode(
    _registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void
  ): TemplateResult<2> {
    return svg`
        <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} >
          ${this.tapOrDragLayer(
            reference => html`
              <prism-kotlin-editor
                ${ref(reference)}
                class="donotdrag"
                style="width: 100%; height: 100%; ${this._safariTransform}"
                .input=${value}
                @input-change=${(e: CustomEvent) => onChange(e.detail.input)}>
              </prism-kotlin-editor>
            `
          )}
        </foreignObject>
        `
  }

  protected renderInput(
    _registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void
  ): TemplateResult<2> {
    return svg`
      <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y}>
      ${this.tapOrDragLayer(
        reference => html`
          <value-input
            ${ref(reference)}
            class="donotdrag"
            style="width: 100%; height: 100%; ${this._safariTransform}"
            .input=${value}
            @input-change=${(e: CustomEvent) => onChange(e.detail.input)}></value-input>
        `
      )}
      </foreignObject>
    `
  }

  protected renderSelector(
    _registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    widgetPosition: Coordinates,
    values: { id: string; display: string }[],
    selected: string,
    onSelect: (id: string) => void
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
