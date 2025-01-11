import { svg } from "lit"
import { BlockType } from "../../blocks/configuration/BlockType"
import { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import { Coordinates } from "../../util/Coordinates"

import type { AnyBlock } from "../../blocks/Block"
import { LogicComparisonOperator, LogicJunctionMode } from "../../blocks/configuration/BlockData"
import { DataType, isArrayType, simpleTypeFromArrayType } from "../../blocks/configuration/DataType"
import { DefinedExpressionData } from "../../blocks/configuration/DefinedExpression"
import { ConnectorRole } from "../../connections/ConnectorRole"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"
import { RectBuilder } from "../../svg/RectBuilder"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import { HeightProp, type SizeProps } from "../SizeProps"
import type { BaseWidgetRenderer } from "../WidgetRenderers/BaseWidgetRenderer"
import { BaseBlockRenderer } from "./BaseBlockRenderer"
import { BlockMarking, type InternalBlockRenderProps, type SvgResult } from "./BlockRendererTypes"
import { KuteBlockInputRenderer } from "./KuteBlockInputRenderer"

export class KuteBlockRenderer extends BaseBlockRenderer {
  protected readonly inputRenderer: KuteBlockInputRenderer

  constructor(
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget,
    requestUpdate: () => void
  ) {
    super(blockRegistry, layouter, setWidget, requestUpdate)
    this.inputRenderer = new KuteBlockInputRenderer(setWidget, requestUpdate)
  }

  protected renderContainer(
    { block, size, globalPosition, marking }: AnyRegisteredBlock,
    _props: InternalBlockRenderProps
  ): SvgResult {
    const rectangle = new RectBuilder({
      width: size.fullWidth,
      height: size.fullHeight,
      radius: 8,
    })

    this.addContainerInsets(rectangle, size)
    this.addContainerNooks(rectangle, block.connectors.all, { size, block, globalPosition })
    this.addContainerCutouts(rectangle, size)

    const path = rectangle.generatePath()
    const stroke = this.determineContainerStroke(marking)

    return svg`
      <path
        id="bg-${block.id}"
        class="highlight-target"
        fill=${this.determineContainerFill(block)}
        fill-rule="evenodd"
        stroke=${stroke.color}
        stroke-width=${stroke.width}
        d=${path}></path>
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

  private addContainerCutouts(rectangle: RectBuilder, size: SizeProps): void {
    // only one cutout is currently supported
    size.cutRows.forEach(row => {
      rectangle.add(
        {
          width: size.middleWidth,
          height: row,
          radius: 10,
        },
        {
          x: size.leftWidth,
          y: size.fullHeadHeight,
        }
      )
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

      const horizontal = [
        ConnectorRole.Input,
        ConnectorRole.Output,
        ConnectorRole.Conditional,
      ].includes(connector.role)

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
      case BlockType.LogicNot:
      case BlockType.LogicJunction:
      case BlockType.LogicComparison:
        return "#1B79DD"
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
            svg`<text x="5" y="40" width=${size.fullWidth} fill="black" style="user-select: none; opacity: 0.6;">${"name" in block.data ? block.data.name : JSON.stringify(block.data)}</text>`
          }
        `
  }

  protected override renderContentFunction(
    registered: RegisteredBlock<BlockType.Function, any>,
    _props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
    return svg`
    <text x=${-size.fullHeadHeight / 2} y="5" transform="rotate(270)" text-anchor="middle" alignment-baseline="hanging" opacity="0.6">fun</text>
      <text x="24" y=${size.fullHeadHeight / 2} fill="black" alignment-baseline="middle">${block.data.name}</text>
    `
  }

  protected override renderContentConditional(
    registered: RegisteredBlock<BlockType.Conditional, any>,
    _props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
    return [
      svg`
      <text x="24" y=${size.fullHeadHeight / 2} fill="black" alignment-baseline="middle">if</text>
      <g transform="translate(86, ${size.fullHeadHeight / 2 - 18}) rotate(90) scale(0.1, 0.125)">
        <path d="M170.71,303.132c-1.836-2.448-4.896-2.448-6.732,0c-3.06,3.672-1.836,7.956-1.836,12.853 c0,6.12-0.612,12.239-1.836,18.359c-1.224,4.896,6.12,6.732,7.956,2.448c1.837-4.896,3.061-10.404,3.673-15.912 C172.547,314.76,174.383,308.028,170.71,303.132z"></path> <path d="M171.322,277.428c-1.224-3.672-1.836-6.731-2.449-10.403c0-1.836,0.612-3.672,0-5.509 c-0.612-1.836-0.612-3.06-1.835-4.896c-1.224-2.448-5.508-2.448-6.732,0c-1.836,4.284-1.836,7.344-0.612,11.628 s1.836,7.956,4.284,12.24C166.426,284.16,172.547,281.712,171.322,277.428z"></path> <path d="M167.038,202.152c-1.224-1.836-4.284-1.836-6.12,0c-2.448,3.06-1.836,5.508-1.836,9.18s0.612,6.732,0.612,10.404 c0.612,4.896,7.344,4.896,7.344,0c0-3.061,0.612-6.12,0.612-9.181C168.874,208.884,170.099,205.824,167.038,202.152z"></path> <path d="M167.65,174.612c-2.448-6.732-1.224-13.464-3.06-20.196c-1.224-3.672-6.732-3.672-7.956,0 c-2.448,7.344,0,15.912,4.284,22.645C162.754,180.732,168.874,178.284,167.65,174.612z"></path> <path d="M163.366,96.276c-1.224-1.224-3.672-1.224-4.896,0c-3.672,3.672-2.448,8.568-2.448,13.464c0,4.284,0,9.18,0.612,13.464 c0.612,3.672,6.732,3.672,7.344,0c0.612-4.284,0.612-7.956,0.612-12.24C165.814,106.068,167.038,100.56,163.366,96.276z"></path> <path d="M157.246,43.644c-3.672,0-6.12,3.672-4.896,6.732c1.224,4.896,1.224,11.016,1.836,15.912c0.612,3.06,6.12,3.06,6.732,0 c0.612-5.508,0-11.016,1.836-15.912C163.366,47.316,160.918,43.644,157.246,43.644z"></path> <path d="M215.387,41.196c-14.076-15.3-29.376-30.6-48.349-40.392c-2.448-1.224-5.508-1.224-7.344,1.224 c-12.852,15.3-22.644,32.436-36.108,47.124c-4.896,4.896,3.06,12.24,7.344,7.344c12.24-13.464,21.42-29.376,33.66-42.84 c15.912,9.792,26.929,23.868,41.005,36.72C212.326,56.496,220.895,47.316,215.387,41.196z"></path>
      </g>
      <text x=${-size.fullHeadHeight - size.bodiesAndIntermediates[0]!.value / 2} y=${size.leftWidth / 2 + 1} font-size="12" transform="rotate(270)" text-anchor="middle" alignment-baseline="middle" opacity="0.6">then</text>
      `,
      block.connectors.byRole(ConnectorRole.If_False)
        ? svg`<text x=${-size.fullHeight + size.fullTailHeight + size.bodiesAndIntermediates[2]!.value / 2} y=${size.leftWidth / 2 + 1} font-size="12" transform="rotate(270)" text-anchor="middle" alignment-baseline="middle" opacity="0.6">else</text>`
        : false,
    ].filter(Boolean) as SvgResult
  }

  protected override renderContentLoop(
    registered: RegisteredBlock<BlockType.Loop, any>,
    _props: InternalBlockRenderProps
  ): SvgResult {
    const { size } = registered
    return svg`
    <text x=${size.fullWidth / 2} y=${size.fullHeadHeight / 2} fill="black" alignment-baseline="middle" text-anchor="middle">loop while</text>
    `
  }

  protected override renderContentVariableInit(
    registered: RegisteredBlock<BlockType.VarInit, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
    return svg`
          <text x=${-size.fullHeight / 2} y="5" transform="rotate(270)" text-anchor="middle" alignment-baseline="hanging">create</text>
          ${this.inputRenderer.inputString(
            registered,
            new Coordinates(24, 6),
            new Coordinates((size.fullWidth - 52) / 2, size.fullHeight - 12),
            block.isInDrawer ? "" : block.data.name,
            (name: string) => block.updateData(cur => ({ ...cur, name })),
            "name",
            props
          )}
          <text x=${-size.fullHeight / 2} y=${(size.fullWidth - 52) / 2 + 26} transform="rotate(270)" text-anchor="middle" alignment-baseline="hanging">as</text>
          ${this.inputRenderer.inputSelector(
            registered,
            new Coordinates((size.fullWidth - 52) / 2 + 44, 6),
            new Coordinates((size.fullWidth - 52) / 2, size.fullHeight - 12),
            new Coordinates(200, 200),
            Object.entries(DataType)
              .filter(([_, it]) => it != DataType.Dynamic)
              .map(([display, id]) => ({ id, display })),
            block.data.type,
            (id: string) => block.updateData(cur => ({ ...cur, type: id })),
            props
          )}
        `
  }

  protected override renderContentVariableSet(
    registered: RegisteredBlock<BlockType.VarSet, any>,
    _props: InternalBlockRenderProps
  ): SvgResult {
    const { size } = registered
    return svg`
      <text x=${-size.fullHeight / 2} y="5" transform="rotate(270)" text-anchor="middle" alignment-baseline="hanging">set</text>
      <text x=${-size.fullHeight / 2} y=${size.leftWidth + size.middleWidth + 4} transform="rotate(270)" text-anchor="middle" alignment-baseline="hanging">to</text>
    `
  }

  protected override renderContentVariable(
    registered: RegisteredBlock<BlockType.Variable, any>,
    _props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
    return svg`
          <text x=${size.fullWidth / 2} y=${size.fullHeight / 2} fill="black" alignment-baseline="middle" text-anchor="middle" font-family="monospace">${block.data.name}</text>
        `
  }

  protected override renderContentValue(
    registered: RegisteredBlock<BlockType.Value, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
    if (block.data.type == DataType.Dynamic) {
      // code editor for dynamic value
      return this.inputRenderer.editableCode(
        registered,
        new Coordinates(6, 6),
        new Coordinates(size.fullWidth - 12, size.fullHeight - 12),
        block.isInDrawer ? "code()" : block.data.value,
        (value: string) => block.updateData(cur => ({ ...cur, value })),
        true,
        props
      )
    }
    if (block.data.type == DataType.Boolean) {
      return this.inputRenderer.inputBoolean(
        registered,
        new Coordinates(5, 5),
        new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
        Boolean(block.data.value),
        (value: boolean) => block.updateData(cur => ({ ...cur, value })),
        props
      )
    }
    if (isArrayType(block.data.type)) {
      return this.inputRenderer.inputArray(
        registered,
        new Coordinates(5, 5),
        new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
        simpleTypeFromArrayType(block.data.type),
        block.data.value,
        (value: any[]) => block.updateData(cur => ({ ...cur, value })),
        props
      )
    }

    return this.inputRenderer.inputString(
      registered,
      new Coordinates(5, 5),
      new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
      block.isInDrawer ? "text" : block.data.value.toString(),
      (value: string) => block.updateData(cur => ({ ...cur, value })),
      block.data.placeholder ?? "text",
      props
    )
  }

  protected override renderContentExpression(
    registered: RegisteredBlock<BlockType.Expression, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { block } = registered
    if (registered.block.data.editable) {
      const language = block.data.editable ? block.data.editable.lang : "kotlin"
      const value = block.data.customExpression?.get(language) ?? ""
      const onChange = (value: string) => {
        block.updateData(cur => {
          const expr = cur.customExpression?.set(language, value)
          return { ...cur, customExpression: expr }
        })
      }

      return this.inputRenderer.editableCode(
        registered,
        new Coordinates(6, 6),
        new Coordinates(registered.size.fullWidth - 12, registered.size.fullHeight - 12),
        block.isInDrawer ? "code()" : value,
        onChange,
        false,
        props
      )
    } else {
      const definedExpressionData = DefinedExpressionData[block.data.expression]
      return svg`<text x="5" y="20" fill="black" style="user-select: none;">${definedExpressionData.display}</text>`
    }
  }

  protected override renderContentLogicNot({
    size,
  }: RegisteredBlock<BlockType.LogicNot, any>): SvgResult {
    return svg`
      <text x=${size.fullWidth / 2 - 2} y=${size.fullHeight / 2} fill="white" text-anchor="middle" alignment-baseline="middle">not</text>
    `
  }

  protected override renderContentLogicJunction(
    registered: RegisteredBlock<BlockType.LogicJunction, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { size, block } = registered
    return svg`
      ${this.inputRenderer.inputSelector(
        registered,
        new Coordinates(6, 6),
        new Coordinates(size.fullWidth - 12, size.fullHeight - 12),
        new Coordinates(200, 110),
        Object.entries(LogicJunctionMode).map(([display, id]) => ({ id, display })),
        block.data.mode,
        (id: string) => block.updateData(cur => ({ ...cur, mode: id as LogicJunctionMode })),
        props
      )}
    `
  }

  protected override renderContentLogicComparison(
    registered: RegisteredBlock<BlockType.LogicComparison, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { size, block } = registered
    return svg`
      ${this.inputRenderer.inputSelector(
        registered,
        new Coordinates(6, 6),
        new Coordinates(size.fullWidth - 12, size.fullHeight - 12),
        new Coordinates(200, 200),
        Object.entries(LogicComparisonOperator).map(([display, id]) => ({ id, display })),
        block.data.mode,
        (id: string) => block.updateData(cur => ({ ...cur, mode: id as LogicComparisonOperator })),
        props
      )}
    `
  }
}
