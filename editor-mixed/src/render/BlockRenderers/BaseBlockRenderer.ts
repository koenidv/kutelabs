import { html, svg, type TemplateResult } from "lit"
import { createRef, type Ref } from "lit/directives/ref.js"
import type { AnyBlock, Block } from "../../blocks/Block"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import { isSafari } from "../../util/browserCheck"
import { Coordinates } from "../../util/Coordinates"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import type { BaseWidgetRenderer } from "../WidgetRenderers/BaseWidgetRenderer"

import { BlockType } from "../../blocks/configuration/BlockType"
import "../../drag/TapOrDragLayer"
import "../../inputs/PrismKotlinEditor"
import "../../inputs/SimpleInputElement"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"

export enum BlockMarking {
  Executing = "executing",
  Error = "error",
}

export type SvgResult = TemplateResult<2> | TemplateResult<2>[]

export abstract class BaseBlockRenderer {
  private readonly blockRegistry: BlockRegistry
  private readonly layouter: BaseLayouter

  protected readonly setWidget: typeof BaseWidgetRenderer.prototype.setWidget

  protected _workspaceScaleFactor = 1
  protected _safariTransform = ""
  public setWorkspaceScaleFactor(value: number) {
    this._workspaceScaleFactor = value
    this._safariTransform = isSafari
      ? `position: fixed; transform: scale(${1 / this._workspaceScaleFactor}); transform-origin: 0 0;`
      : ""
  }

  constructor(
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget
  ) {
    this.blockRegistry = blockRegistry
    this.layouter = layouter
    this.setWidget = setWidget
  }

  render(): TemplateResult<2>[] {
    this.init()
    return this.renderFromRoot()
  }

  protected init() {
    this.layouter.measureSetAll()
    this.layouter.calculatePositionsFromRoot()
  }

  //#region Render blocks

  /**
   * Renders all blocks, beginning from the root
   * @returns List of SVG templates for all blocks
   */
  protected renderFromRoot(): TemplateResult<2>[] {
    if (this.blockRegistry.root == null) throw new Error("Cannot render; root is not set")
    return this.blockRegistry.root.blocks.map(({ block, position }) => {
      return this.renderBlock(block, position)
    })
  }

  /**
   * Render a block at a position relative to an upstream connected block
   * @param block Block to render
   * @param previousBlock Upstream connected block
   */
  public renderBlock(block: AnyBlock, previousBlock: AnyBlock): TemplateResult<2>
  /**
   * Render a block with an offset to its upstream block.
   * Use this to render Blocks from the root
   * @param block Block to render
   * @param translatePosition Offset to upstream block, i.e. will render at this position for root upstream
   */
  public renderBlock(block: AnyBlock, translatePosition: Coordinates): TemplateResult<2>
  /**
   * Renders a block with an offset to a reference block
   * @param block Block to render
   * @param ref Block or Coordinate Object to render the block relative to
   * @returns SVG template for block group
   */
  public renderBlock(block: AnyBlock, ref: AnyBlock | Coordinates): TemplateResult<2> {
    return this.draggableContainer(
      block.id,
      this.determineRenderOffset(block, ref),
      block.draggable,
      () =>
        this.renderBlockElement(this.blockRegistry.getRegistered(block), (next: AnyBlock) =>
          this.renderBlock(next, block)
        )
    )
  }

  protected renderBlockElement(
    registered: AnyRegisteredBlock,
    renderConnected: (block: AnyBlock) => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
    <g class="block-${registered.block.type}">
      ${this.renderContainer(registered)}
      ${this.renderContent(registered)}
      ${registered.block.downstreamWithConnectors.map(it => renderConnected(it.block))}
	  </g>
    `
  }

  protected renderContent(registered: AnyRegisteredBlock): SvgResult {
    switch (registered.block.type) {
      case BlockType.Function:
        return this.renderContentFunction(registered as RegisteredBlock<BlockType.Function, any>)
      case BlockType.Expression:
        return this.renderContentExpression(
          registered as RegisteredBlock<BlockType.Expression, any>
        )
      case BlockType.Value:
        return this.renderContentValue(registered as RegisteredBlock<BlockType.Value, any>)
      case BlockType.Variable:
        return this.renderContentVariable(registered as RegisteredBlock<BlockType.Variable, any>)
      case BlockType.VarInit:
        return this.renderContentVariableInit(registered as RegisteredBlock<BlockType.VarInit, any>)
      case BlockType.VarSet:
        return this.renderContentVariableSet(registered as RegisteredBlock<BlockType.VarSet, any>)
      case BlockType.Loop:
        return this.renderContentLoop(registered as RegisteredBlock<BlockType.Loop, any>)
      case BlockType.Conditional:
        return this.renderContentConditional(
          registered as RegisteredBlock<BlockType.Conditional, any>
        )
      default:
        console.error("No content renderer for block type", registered.block.type)
        return this.renderDefaultContent(registered)
    }
  }

  //#region Utilities

  protected tapOrDragLayer(content: (ref: Ref<HTMLElement>) => TemplateResult<1>) {
    const ref = createRef<HTMLElement>()
    return html`
      <tap-or-drag-layer .tappableComponent=${ref}> ${content(ref)} </tap-or-drag-layer>
    `
  }

  protected draggableContainer(
    blockId: string,
    translate: Coordinates,
    draggable: boolean = true,
    child: () => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
    <g class="${draggable ? "dragable" : "nodrag"} block" transform="translate(${translate.x}, ${translate.y})" id="block-${blockId}">
      ${child()}
    </g>`
  }

  private determineRenderOffset(block: AnyBlock, ref: AnyBlock | Coordinates): Coordinates {
    if (ref instanceof Coordinates) return ref
    else
      return Coordinates.subtract(
        this.blockRegistry.getPosition(block),
        this.blockRegistry.getPosition(ref)
      )
  }

  //#region Input Wrappers

  protected editableCode(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates
  ): TemplateResult<2> {
    const block = registered.block as Block<BlockType.Expression>
    const language = block.data.editable ? block.data.editable.lang : "kotlin"
    return this.renderEditableCode(
      registered,
      position,
      size,
      block.data.customExpression?.get(language) ?? "",
      (value: string) => {
        block.updateData(cur => {
          const expr = cur.customExpression?.set(language, value)
          return { ...cur, customExpression: expr }
        })
      }
    )
  }

  //#region Block Contents

  protected renderContentFunction(
    registered: RegisteredBlock<BlockType.Function, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentExpression(
    registered: RegisteredBlock<BlockType.Expression, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentValue(
    registered: RegisteredBlock<BlockType.Value, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentVariable(
    registered: RegisteredBlock<BlockType.Variable, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentVariableInit(
    registered: RegisteredBlock<BlockType.VarInit, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentVariableSet(
    registered: RegisteredBlock<BlockType.VarSet, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentLoop(
    registered: RegisteredBlock<BlockType.Loop, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentConditional(
    registered: RegisteredBlock<BlockType.Conditional, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  //#region Abstract methods

  protected abstract renderContainer(
    registered: AnyRegisteredBlock
  ): SvgResult

  protected abstract renderDefaultContent(
    registered: AnyRegisteredBlock
  ): SvgResult

  protected abstract renderEditableCode(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void
  ): TemplateResult<2>

  protected abstract renderInput(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void
  ): TemplateResult<2>

  protected abstract renderSelector(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    widgetPosition: Coordinates,
    values: { id: string; display: string }[],
    selected: string,
    onSelect: (id: string) => void
  ): TemplateResult<2>
}

export type BlockRendererConstructorType = {
  new (
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget
  ): BaseBlockRenderer
}
