import { html, svg, type TemplateResult } from "lit"
import { createRef, type Ref } from "lit/directives/ref.js"
import type { AnyBlock, Block } from "../../blocks/Block"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"
import { isSafari } from "../../util/browserCheck"
import { Coordinates } from "../../util/Coordinates"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import type { BaseWidgetRenderer } from "../WidgetRenderers/BaseWidgetRenderer"

/* import custom elements - this is required but will not throw if it's removed */
import "../../drag/TapOrDragLayer"
import "../../inputs/PrismKotlinEditor"
import "../../inputs/SimpleInputElement"

export enum BlockMarking {
  Executing = "executing",
  Error = "error",
}

export type SvgResult = TemplateResult<2> | TemplateResult<2>[]

/**
 * The BlockRenderer is responsible for rendering blocks in the workspace.
 * It will also be called from other renderers to render blocks in different contexts.
 */
export abstract class BaseBlockRenderer {
  private readonly blockRegistry: BlockRegistry
  private readonly layouter: BaseLayouter

  protected readonly setWidget: typeof BaseWidgetRenderer.prototype.setWidget

  /* Because Safari doesn't apply viewBox scaling to foreignObject elements, we need to apply a workaround*/
  protected _workspaceScaleFactor = 1
  /** additional classes to apply, will hold scale information for safari */
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

  /**
   * Renders all blocks in the workspace
   * @returns List of an SVG template for each block
   */
  render(): TemplateResult<2>[] {
    this.init()
    return this.renderFromRoot()
  }

  /**
   * Measures and positions all blocks in the workspace for a complete rerender
   */
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

  /**
   * Renders a block element and its connected blocks
   * @param registered registered block to render
   * @param renderConnected Function to render a connected block
   * @returns SVG template for block group
   */
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

  /**
   * Renders the content of a block, depending on its type
   * @param registered registered block to render
   * @returns SVG template for block content
   */
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
      case BlockType.LogicNot:
        return this.renderContentLogicNot(registered as RegisteredBlock<BlockType.LogicNot, any>)
      default:
        console.error("No content renderer for block type", registered.block.type)
        return this.renderDefaultContent(registered)
    }
  }

  //#region Utilities

  /**
   * Wraps a block in a tap-or-drag-layer element to enable dragging the block on this element
   * @param content Function to render the content of the layer
   * @returns HTML template result
   */
  protected tapOrDragLayer(content: (ref: Ref<HTMLElement>) => TemplateResult<1>) {
    const ref = createRef<HTMLElement>()
    return html`
      <tap-or-drag-layer .tappableComponent=${ref}> ${content(ref)} </tap-or-drag-layer>
    `
  }

  /**
   * Wraps a block in a container that will be recognized as draggable by the DragHelper.
   * The container should also handle displaying block markings.
   * @param blockId id of the block
   * @param translate offset to the previous group
   * @param draggable whether the block should be draggable
   * @param child Function to render the content of the group
   * @returns SVG template for block group
   */
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

  /**
   * Determines the offset to render a block relative to a reference block or coordinates.
   * - If the reference is a block, the offset is calculated from the block's position.
   * - If the reference is coordinates, the offset is the coordinates.
   * @param block block that is going to be rendered
   * @param ref reference block or coordinates to calulcate the offset from
   * @returns offset coordinates from the previous group
   */
  private determineRenderOffset(block: AnyBlock, ref: AnyBlock | Coordinates): Coordinates {
    if (ref instanceof Coordinates) return ref
    else
      return Coordinates.subtract(
        this.blockRegistry.getPosition(block),
        this.blockRegistry.getPosition(ref)
      )
  }

  //#region Input Wrappers

  /**
   * Renders an input field for a block.
   * This wrapper handles retrieving the language-specific value and changes to it.
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @returns SVG template result for the editable code input
   */
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

  /** Override this to customize how the content of **function** blocks is rendered */
  protected renderContentFunction(registered: RegisteredBlock<BlockType.Function, any>): SvgResult {
    return this.renderDefaultContent(registered)
  }

  /** Override this to customize how the content of **expression** blocks is rendered */
  protected renderContentExpression(
    registered: RegisteredBlock<BlockType.Expression, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  /** Override this to customize how the content of **value** blocks is rendered */
  protected renderContentValue(registered: RegisteredBlock<BlockType.Value, any>): SvgResult {
    return this.renderDefaultContent(registered)
  }

  /** Override this to customize how the content of **variable** blocks is rendered */
  protected renderContentVariable(registered: RegisteredBlock<BlockType.Variable, any>): SvgResult {
    return this.renderDefaultContent(registered)
  }

  /** Override this to customize how the content of **variable init** blocks is rendered */
  protected renderContentVariableInit(
    registered: RegisteredBlock<BlockType.VarInit, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  /** Override this to customize how the content of **variable set** blocks is rendered */
  protected renderContentVariableSet(
    registered: RegisteredBlock<BlockType.VarSet, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  /** Override this to customize how the content of **loop** blocks is rendered */
  protected renderContentLoop(registered: RegisteredBlock<BlockType.Loop, any>): SvgResult {
    return this.renderDefaultContent(registered)
  }

  /** Override this to customize how the content of **conditional** blocks is rendered */
  protected renderContentConditional(
    registered: RegisteredBlock<BlockType.Conditional, any>
  ): SvgResult {
    return this.renderDefaultContent(registered)
  }

  protected renderContentLogicNot(registered: RegisteredBlock<BlockType.LogicNot, any>): SvgResult {
    return this.renderDefaultContent(registered)
  }

  //#region Abstract methods

  /**
   * Renders the background container for a block.
   * The container is rendered behind the elements of the block and does not have children.
   * @param registered registered block that is being rendered
   * @returns SVG template or array for the container
   */
  protected abstract renderContainer(registered: AnyRegisteredBlock): SvgResult

  /**
   * Renders the contents of a block when no specific content renderer is defined.
   * @param registered registered block to render contents for
   * @returns SVG template or array
   */
  protected abstract renderDefaultContent(registered: AnyRegisteredBlock): SvgResult

  /**
   * Renders an editable code input field
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   */
  protected abstract renderEditableCode(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void
  ): TemplateResult<2>

  /**
   * Renders an input field for a block
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   */
  protected abstract renderInput(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void
  ): TemplateResult<2>

  /**
   * Renders a selector input
   * The input may display a widget to facilitate selecting from a list of values
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param widgetPosition position of the widget, relative to the root (global svg position)
   * @param values list of ids and values to select from
   * @param selected id of the currently selected value
   * @param onSelect function to call with the selected id when a value is selected
   */
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
