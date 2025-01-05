import { html, svg, type TemplateResult } from "lit"
import { BlockType } from "../../blocks/configuration/BlockType"
import { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import { Coordinates } from "../../util/Coordinates"
import { BaseBlockRenderer, BlockMarking, type SvgResult } from "./BaseBlockRenderer"

import { ref } from "lit/directives/ref.js"
import { DataType } from "../../blocks/configuration/DataType"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"
import { RectBuilder } from "../../svg/RectBuilder"
import { HeightProp, type SizeProps } from "../SizeProps"
import type { AnyBlock } from "../../blocks/Block"
import { ConnectorRole } from "../../connections/ConnectorRole"

export class KuteBlockRenderer extends BaseBlockRenderer {
  protected renderContainer({
    block,
    size,
    globalPosition,
    marking,
  }: AnyRegisteredBlock): SvgResult {
    const rectangle = new RectBuilder({
      width: size.fullWidth,
      height: size.fullHeight,
      radius: 8,
    })

    this.addContainerInsets(rectangle, size)
    this.addContainerNooks(rectangle, block.connectors.all, { size, block, globalPosition })

    const path = rectangle.generatePath()
    const stroke = this.determineContainerStroke(marking)

    return svg`
      <path fill=${this.determineContainerFill(block)} stroke=${stroke.color} stroke-width=${stroke.width} d=${path}></path>
    `
  }

  private addContainerInsets(rectangle: RectBuilder, size: SizeProps): void {
    const innerHeights = size.bodiesAndIntermediates
    if (innerHeights.length == 0) return
    let currentHeight = size.fullHeadHeight
    innerHeights.forEach(({ prop, value: propHeight }) => {
      switch (prop) {
        case HeightProp.Body:
          rectangle.addToRight(
            {
              width: propHeight,
              depth: size.rightWidth,
              openRadius: 8,
              innerRadius: 10,
            },
            currentHeight
          )
          currentHeight += propHeight
          break
        case HeightProp.Intermediate:
          currentHeight += propHeight
          break
      }
    })
  }

  private addContainerNooks(
    rectangle: RectBuilder,
    connectors: Connector[],
    {
      size,
      block,
      globalPosition: blockPosition,
    }: AnyRegisteredBlock | { size: SizeProps; block: AnyBlock; globalPosition: Coordinates }
  ): void {
    if (connectors.length == 0) return

    connectors.forEach(connector => {
      if (connector.type == ConnectorType.Internal) return
      const inward =
        (connector.type == ConnectorType.Before && connector.role != ConnectorRole.Input) ||
        connector.role == ConnectorRole.Output ||
        connector.type == ConnectorType.Extension

      const horizontal =
        [ConnectorRole.Input, ConnectorRole.Output, ConnectorRole.Conditional].includes(
          connector.role
        ) && ConnectorType.Inner != connector.type

      rectangle.add(
        {
          width: 10,
          length: 5,
          mode: inward ? "inward" : "outward",
          pointing: horizontal ? "horizontal" : "vertical",
          pointRadius: inward ? 4 : 3,
          baseRadius: 2,
        },
        {
          x: connector.globalPosition.x - blockPosition.x,
          y: connector.globalPosition.y - blockPosition.y,
        }
      )
    })

    if (block.type == BlockType.Function) {
      rectangle.add(
        {
          width: 10,
          length: 5,
          mode: "inward",
          pointing: "vertical",
          pointRadius: 4,
          baseRadius: 2,
        },
        {
          x:
            connectors.find(it => it.type == ConnectorType.Inner)!.globalPosition.x -
            blockPosition.x,
          y:
            size.fullHeadHeight +
            size.bodiesAndIntermediates.reduce((acc, cur) => acc + cur.value, 0),
        }
      )
    }
  }

  private determineContainerFill(block: AnyBlock): string {
    switch (block.type) {
      case BlockType.Function:
        return "#FFD166"
      case BlockType.Expression:
      case BlockType.VarInit:
      case BlockType.VarSet:
        return "#1AD9FF"
      case BlockType.Conditional:
      case BlockType.Loop:
        return "#06D6A0"
      case BlockType.Value:
        return "#DBC0FF"
      case BlockType.Variable:
        return "#FFA1BF"
      default:
        return "#ffffff"
    }
  }

  private determineContainerStroke(marking: BlockMarking | null): { color: string; width: number } {
    switch (marking) {
      case BlockMarking.Executing:
        return { color: "#355F3B", width: 3 }
      case BlockMarking.Error:
        return { color: "#FA003F", width: 3 }
      default:
        return { color: "#303030", width: 1 }
    }
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
      return this.editableCode(
        registered,
        new Coordinates(30, 10),
        new Coordinates(registered.size.fullWidth - 40, registered.size.fullHeight - 20)
      )
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
        <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} style="border-radius: 6px;">
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
      <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} style="border-radius: 6px;">
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
      <rect width=${size.x} height=${size.y} fill="white" stroke="black" stroke-width="1" rx="6"/>
      <text x="5" y="${size.y / 2 + 6}">${selected}</text>
      </g>
    `
  }
}
