import { svg, type TemplateResult } from "lit"
import { BlockType } from "../../blocks/configuration/BlockType"
import { Connector } from "../../connections/Connector"
import { ConnectorType } from "../../connections/ConnectorType"
import { Coordinates } from "../../util/Coordinates"

import { guard } from "lit/directives/guard.js"
import type { AnyBlock } from "../../blocks/Block"
import {
  LogicComparisonOperator,
  LogicJunctionMode,
  MathOperation,
  type BlockDataComment,
} from "../../blocks/configuration/BlockData"
import { DataType, isArrayType, simpleTypeFromArrayType } from "../../blocks/configuration/DataType"
import { DefinedExpressionData } from "../../blocks/configuration/DefinedExpression"
import { ConnectorRole } from "../../connections/ConnectorRole"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"
import { RectBuilder } from "../../svg/RectBuilder"
import { adjustHex } from "../../util/ColorUtils"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import { type SizeProps } from "../SizeProps"
import type { BaseWidgetRenderer } from "../WidgetRenderers/BaseWidgetRenderer"
import type { BaseBlockInputRenderer } from "./BaseBlockInputRenderer"
import { BaseBlockRenderer } from "./BaseBlockRenderer"
import { BlockMarking, type InternalBlockRenderProps, type SvgResult } from "./BlockRendererTypes"
import { BlockInputIcon } from "./InputIcon"
import { NeoBlockInputRenderer } from "./NeoBlockInputRenderer"

export class NeoBlockRenderer extends BaseBlockRenderer {
  protected readonly inputRenderer: BaseBlockInputRenderer

  constructor(
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget,
    requestUpdate: () => void
  ) {
    super(blockRegistry, layouter, setWidget, requestUpdate)
    this.inputRenderer = new NeoBlockInputRenderer(setWidget, requestUpdate)
  }

  override render(): TemplateResult<2>[] {
    return [this.defineStuds(), ...super.render()]
  }

  protected defineStuds(): TemplateResult<2> {
    return svg`
      <defs>
        <mask id="stud-mask">
          <circle cx="7.5" cy="7.5" r="5" fill="white" />
          <circle cx="7.5" cy="7.5" r="4" fill="black" />
      </mask>
        <pattern id="studs" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="5" fill="#00000060"  mask="url(#stud-mask)" />
          <circle cx="8" cy="8" r="4" fill="#00000010" />
        </pattern>
      </defs>
    `
  }

  protected renderContainer(
    { block, size, globalPosition, marking }: AnyRegisteredBlock,
    _props: InternalBlockRenderProps
  ): SvgResult {
    return guard(
      [
        block.id,
        JSON.stringify(size),
        globalPosition.x,
        globalPosition.y,
        this.blockRegistry.getMarkedIds(),
      ],
      () => {
        const rectangle = new RectBuilder({
          width: size.fullWidth,
          height: size.fullHeight,
          radius: 0,
        })

        this.addContainerNooks(rectangle, block.connectors.all, { size, block, globalPosition })

        const path = rectangle.generatePath()
        const fillColor = this.determineContainerFill(block)
        const stroke = this.determineContainerStroke(block, fillColor, marking)

        // style=${`filter: ${`drop-shadow(2px 2px 0 #000)`.repeat(1)}`}
        // filter="url(#neobox)"

        return svg`
          <path
            id="bg-${block.id}"
            class="highlight-target"
            fill=${fillColor}
            fill-rule="evenodd"
            stroke=${stroke.color}
            stroke-width=${stroke.width}
            style="filter: drop-shadow(2px 2px 0 #000)"
            d=${path}></path>
          
          ${this.renderDropZones(size)}
        `
      }
    ) as SvgResult
  }

  private renderDropZones(size: SizeProps): SvgResult {
    return size.zones.map(
      el =>
        svg`
        <rect
          fill="url(#studs)"
          transform=${`translate(${el.x}, ${el.y})`}
          width=${el.width}
          height=${el.height}>
        </rect>
        `
    )
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

      if (connector.type === ConnectorType.Internal) return

      rectangle.add(
        {
          type: "pin",
          size: { x: 16, y: 16 },
          outerRadius: 0,
          innerSize: 9,
          innerOffset: 8,
        },
        {
          x: connector.globalPosition.x - blockPosition.x,
          y: connector.globalPosition.y - blockPosition.y,
        }
      )

      // if (connector.type == ConnectorType.Internal) return
      // const inward =
      //   (connector.type == ConnectorType.Before && connector.role != ConnectorRole.Input) ||
      //   connector.role == ConnectorRole.Output ||
      //   connector.type == ConnectorType.Extension

      // const horizontal = [
      //   ConnectorRole.Input,
      //   ConnectorRole.Output,
      //   ConnectorRole.Conditional,
      // ].includes(connector.role)
    })

    // if (block.type == BlockType.Function) {
    //   rectangle.add(
    //     {
    //       width: 10,
    //       length: 5,
    //       mode: "inward",
    //       pointing: "vertical",
    //       pointRadius: 4,
    //       baseRadius: 2,
    //     },
    //     {
    //       x:
    //         connectors.find(it => it.type == ConnectorType.Inner)!.globalPosition.x -
    //         blockPosition.x,
    //       y:
    //         size.fullHeadHeight +
    //         size.bodiesAndIntermediates.reduce((acc, cur) => acc + cur.value, 0),
    //     }
    //   )
    // }
  }

  private determineContainerFill(block: AnyBlock): string {
    switch (block.type) {
      case BlockType.Comment:
        return (block.data as BlockDataComment).backgroundColor ?? "#fff"
      case BlockType.Function:
      case BlockType.FunctionInvoke:
        return "#ff9b30"
      case BlockType.Expression:
      case BlockType.VarInit:
      case BlockType.VarSet:
        return "#21D9D6"
      case BlockType.Conditional:
      case BlockType.Loop:
        return "#23DE75"
      case BlockType.Value:
        return "#6828EF"
      case BlockType.Variable:
        return "#F33A6A"
      case BlockType.LogicNot:
      case BlockType.LogicJunction:
      case BlockType.LogicComparison:
      case BlockType.MathOperation:
        return "#3639f5"
      default:
        return "#ffffff"
    }
  }

  private determineContainerStroke(
    block: AnyBlock,
    fillColor: string,
    marking: BlockMarking | null
  ): { color: string; width: number } {
    if (
      block.type == BlockType.Comment &&
      block.data &&
      "borderColor" in block.data &&
      block.data.borderColor
    ) {
      return { color: block.data.borderColor, width: 2 }
    }
    switch (marking) {
      case BlockMarking.Executing:
        return { color: "#740dfa", width: 3 }
      case BlockMarking.Error:
        return { color: "#FA003F", width: 5 }
      default:
        return { color: adjustHex(fillColor, -130), width: 2 }
    }
  }

  protected renderDefaultContent({ block, size }: AnyRegisteredBlock): SvgResult {
    return svg`<text x=${size.fullWidth / 2} y=${size.fullHeight / 2} fill="white" alignment-baseline="middle" text-anchor="middle" font-family="monospace">
      ${block.data && "name" in block.data ? block.data.name : block.type}
    </text>`
  }

  protected override renderContentComment(
    registered: RegisteredBlock<BlockType.Comment, any>,
    _props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered
    return svg`
      <text 
        x=${size.fullWidth / 2} 
        y=${size.fullHeight / 2} 
        fill=${block.data.textColor ?? "black"} 
        font-size=${block.data.fontSize ?? 12}
        alignment-baseline="middle" 
        text-anchor="middle" 
        font-family="monospace"
        font-weight="400"
        transform="rotate(${block.data.rotation ?? 0}, ${size.fullWidth / 2}, ${size.fullHeight / 2})"
      >${block.data.value}</text>
    `
  }

  protected override renderContentFunction(
    registered: RegisteredBlock<BlockType.Function, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { block, size } = registered

    const head = svg`
    <text x=${-size.heads[0] / 2} y="5" transform="rotate(270)" text-anchor="middle" alignment-baseline="hanging" opacity="0.65" fill="white">fun</text>
      ${
        block.data.isMain || block.data.nameEditable === false
          ? svg`<text x="24" y=${size.heads[0] / 2} fill="white" alignment-baseline="middle">${block.data.name}</text>`
          : this.inputRenderer.inputString(
              registered,
              new Coordinates(24, 6),
              new Coordinates(size.fullWidth - 32, size.heads[0] - 12),
              !block.isInDrawer && (block.data.nameEditable ?? true),
              block.isInDrawer ? "" : block.data.name,
              (name: string) => block.updateData(cur => ({ ...cur, name })),
              "name",
              props
            )
      }
    `

    let params: TemplateResult<2>[] = []
    let accY = size.heads[0]

    block.data.params.map((param, index) => {
      params.push(
        this.inputRenderer.inputString(
          registered,
          new Coordinates(6, accY),
          new Coordinates(
            (size.fullWidth - 8 - size.heads[index + 1]) / 2 - 3,
            (size.heads[index + 1] ?? 6) - 6
          ),
          !block.isInDrawer && (block.data.paramsEditable ?? !block.data.isMain),
          param.name,
          (name: string) => {
            block.updateData(cur => ({
              ...cur,
              params: cur.params.map((p, i) => (i == index ? { ...p, name } : p)),
            }))
          },
          "param",
          props
        )
      )
      params.push(
        this.inputRenderer.inputSelector(
          registered,
          new Coordinates(6 + (size.fullWidth - 8 - size.heads[index + 1]) / 2 + 1, accY),
          new Coordinates(
            (size.fullWidth - 8 - size.heads[index + 1]) / 2 - 3,
            (size.heads[index + 1] ?? 6) - 6
          ),
          new Coordinates(200, 200),
          !block.isInDrawer && (block.data.paramsEditable ?? !block.data.isMain),
          Object.entries(DataType)
            .filter(
              ([_, it]) =>
                ![
                  DataType.Dynamic,
                  DataType.FunctionInvokation,
                  DataType.FunctionReference,
                ].includes(it)
            )
            .map(([display, id]) => ({ id, display })),
          param.type,
          (id: string) =>
            block.updateData(cur => ({
              ...cur,
              params: cur.params.map((p, i) => (i == index ? { ...p, type: id as DataType } : p)),
            })),
          props
        )
      )
      params.push(
        this.inputRenderer.inputButton(
          registered,
          new Coordinates(12 + (size.fullWidth - 15 - size.heads[index + 1]) + 3, accY),
          new Coordinates((size.heads[index + 1] ?? 6) - 6, (size.heads[index + 1] ?? 6) - 6),
          !block.isInDrawer && (block.data.paramsEditable ?? !block.data.isMain),
          { label: `Remove parameter ${param.name}` },
          () => {
            block.updateData(cur => ({
              ...cur,
              params: cur.params.filter((_, i) => i != index),
            }))
            this.requestUpdate()
          },
          BlockInputIcon.Remove,
          props
        )
      )
      accY += size.heads[index + 1]
    })

    if (block.data.paramsEditable ?? !block.data.isMain) {
      params.push(
        this.inputRenderer.inputButton(
          registered,
          new Coordinates(6, accY),
          new Coordinates(size.fullWidth - 12, (size.heads[block.data.params.length + 1] ?? 5) - 6),
          !block.isInDrawer && (block.data.paramsEditable ?? !block.data.isMain),
          "Param",
          () => {
            block.updateData(cur => ({
              ...cur,
              params: [...cur.params, { name: "", type: DataType.String }],
            }))
            this.requestUpdate()
          },
          BlockInputIcon.Add,
          props
        )
      )
    }

    return [head, ...params]
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
    <text x="24" y=${size.fullHeadHeight / 2 - 8} fill="black" alignment-baseline="middle" text-anchor="start">loop</text>
    <text x="24" y=${size.fullHeadHeight / 2 + 8} fill="black" alignment-baseline="middle" text-anchor="start">while</text>
    <g transform="translate(90, ${size.fullHeadHeight / 2 - 18}) rotate(90) scale(0.1, 0.125)">
        <path d="M167.65,174.612c-2.448-6.732-1.224-13.464-3.06-20.196c-1.224-3.672-6.732-3.672-7.956,0 c-2.448,7.344,0,15.912,4.284,22.645C162.754,180.732,168.874,178.284,167.65,174.612z"></path> <path d="M163.366,96.276c-1.224-1.224-3.672-1.224-4.896,0c-3.672,3.672-2.448,8.568-2.448,13.464c0,4.284,0,9.18,0.612,13.464 c0.612,3.672,6.732,3.672,7.344,0c0.612-4.284,0.612-7.956,0.612-12.24C165.814,106.068,167.038,100.56,163.366,96.276z"></path> <path d="M157.246,43.644c-3.672,0-6.12,3.672-4.896,6.732c1.224,4.896,1.224,11.016,1.836,15.912c0.612,3.06,6.12,3.06,6.732,0 c0.612-5.508,0-11.016,1.836-15.912C163.366,47.316,160.918,43.644,157.246,43.644z"></path> <path d="M215.387,41.196c-14.076-15.3-29.376-30.6-48.349-40.392c-2.448-1.224-5.508-1.224-7.344,1.224 c-12.852,15.3-22.644,32.436-36.108,47.124c-4.896,4.896,3.06,12.24,7.344,7.344c12.24-13.464,21.42-29.376,33.66-42.84 c15.912,9.792,26.929,23.868,41.005,36.72C212.326,56.496,220.895,47.316,215.387,41.196z"></path>
      </g>
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
            block.data.nameEditable ?? true,
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
            block.data.typeEditable ?? true,
            Object.entries(DataType)
              .filter(
                ([_, it]) =>
                  ![
                    DataType.Dynamic,
                    DataType.FunctionInvokation,
                    DataType.FunctionReference,
                  ].includes(it)
              )
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
      <text x=${-size.fullHeight / 2} y="4" transform="rotate(270)" text-anchor="middle" alignment-baseline="hanging">set</text>
      <text x=${-size.fullHeight / 2} y=${size.fullWidth - 8} transform="rotate(270)" text-anchor="middle" alignment-baseline="baseline">to</text>
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
        !block.isInDrawer && (block.data.editable ?? true),
        !block.isInDrawer || !block.data.editable ? block.data.value : "code()",
        (value: string) => block.updateData(cur => ({ ...cur, value })),
        true,
        props
      )
    } else if (block.data.type == DataType.Boolean) {
      return this.inputRenderer.inputBoolean(
        registered,
        new Coordinates(5, 5),
        new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
        !block.isInDrawer && (block.data.editable ?? true),
        Boolean(block.data.value),
        (value: boolean) => block.updateData(cur => ({ ...cur, value })),
        props
      )
    } else if (block.data.type == DataType.Int || block.data.type == DataType.Float) {
      return this.inputRenderer.inputNumber(
        registered,
        new Coordinates(5, 5),
        new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
        !block.isInDrawer && (block.data.editable ?? true),
        !block.isInDrawer || !block.data.editable ? block.data.value : null,
        (value: number) => block.updateData(cur => ({ ...cur, value })),
        block.data.type == DataType.Float,
        (block.data.placeholder ?? block.data.type == DataType.Int) ? "number" : "decimal",
        props
      )
    } else if (isArrayType(block.data.type)) {
      return this.inputRenderer.inputArray(
        registered,
        new Coordinates(5, 5),
        new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
        simpleTypeFromArrayType(block.data.type),
        !block.isInDrawer && (block.data.editable ?? true),
        block.data.value,
        (value: any[]) => block.updateData(cur => ({ ...cur, value })),
        props
      )
    }
    return this.inputRenderer.inputString(
      registered,
      new Coordinates(5, 5),
      new Coordinates(size.fullWidth - 10, size.fullHeight - 10),
      !block.isInDrawer && (block.data.editable ?? true),
      !block.isInDrawer || !block.data.editable ? block.data.value : null,
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
        block.data.editable !== false,
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
      <text x="32" y=${size.fullHeight / 2} fill="white" text-anchor="middle" alignment-baseline="middle">not</text>
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
        block.data.editable ?? true,
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
        block.data.editable ?? true,
        Object.entries(LogicComparisonOperator).map(([display, id]) => ({ id, display })),
        block.data.mode,
        (id: string) => block.updateData(cur => ({ ...cur, mode: id as LogicComparisonOperator })),
        props
      )}
    `
  }

  protected override renderContentMathOperation(
    registered: RegisteredBlock<BlockType.MathOperation, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    const { size, block } = registered
    return svg`
      ${this.inputRenderer.inputSelector(
        registered,
        new Coordinates(6, 6),
        new Coordinates(size.fullWidth - 14, size.fullHeight - 12),
        new Coordinates(200, 200),
        block.data.editable ?? true,
        Object.entries(MathOperation).map(([display, id]) => ({ id, display })),
        block.data.mode,
        (id: string) => block.updateData(cur => ({ ...cur, mode: id as MathOperation })),
        props
      )}
    `
  }
}
