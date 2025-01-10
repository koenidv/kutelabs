import { svg } from "lit"
import { BlockType } from "../../blocks/configuration/BlockType"
import { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import { Coordinates } from "../../util/Coordinates"

import type { AnyBlock } from "../../blocks/Block"
import { LogicComparisonOperator, LogicJunctionMode } from "../../blocks/configuration/BlockData"
import { DataType } from "../../blocks/configuration/DataType"
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

    const path = rectangle.generatePath()
    const stroke = this.determineContainerStroke(marking)

    return svg`
      <path
        id="bg-${block.id}"
        class="highlight-target"
        fill=${this.determineContainerFill(block)}
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
            svg`<text x="5" y="40" width=${size.fullWidth} fill="black" style="user-select: none; opacity: 0.6;">${JSON.stringify(block.data)}</text>`
          }
        `
  }

  protected override renderContentVariableInit(
    registered: RegisteredBlock<BlockType.VarInit, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
    return svg`
          <text x="5" y="15">create var</text>
          ${this.inputRenderer.inputString(
            registered,
            new Coordinates(5, 20),
            new Coordinates(size.fullWidth - 10, 20),
            block.data.name,
            (name: string) => block.updateData(cur => ({ ...cur, name })),
            props
          )}
          <text x="5" y="55">as</text>
          ${this.inputRenderer.inputSelector(
            registered,
            new Coordinates(5, 60),
            new Coordinates(size.fullWidth - 10, 28),
            new Coordinates(200, 200),
            Object.entries(DataType).map(([display, id]) => ({ id, display })),
            block.data.type,
            (id: string) => block.updateData(cur => ({ ...cur, type: id })),
            props
          )}
        `
  }

  protected override renderContentValue(
    registered: RegisteredBlock<BlockType.Value, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
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
    return this.inputRenderer.inputString(
      registered,
      new Coordinates(5, 5),
      new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
      block.data.value.toString(),
      (value: string) => block.updateData(cur => ({ ...cur, value })),
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
        value,
        onChange,
        props
      )
    } else
      return svg`<text x="5" y="20" fill="black" style="user-select: none;">${registered.block.data.expression}</text>`
  }

  protected override renderContentLogicNot(_: RegisteredBlock<BlockType.LogicNot, any>): SvgResult {
    return svg`
      <text x="5" y="20" fill="white" style="user-select: none;">not</text>
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
        new Coordinates(5, 5),
        new Coordinates(size.fullWidth - 15, 28),
        new Coordinates(200, 200),
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
        new Coordinates(5, 5),
        new Coordinates(size.fullWidth - 15, 28),
        new Coordinates(200, 200),
        Object.entries(LogicComparisonOperator).map(([display, id]) => ({ id, display })),
        block.data.mode,
        (id: string) => block.updateData(cur => ({ ...cur, mode: id as LogicComparisonOperator })),
        props
      )}
    `
  }
}
