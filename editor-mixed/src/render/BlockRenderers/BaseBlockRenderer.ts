import { html, svg, type TemplateResult } from "lit"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import { Coordinates } from "../../util/Coordinates"
import { SizeProps } from "../SizeProps"
import type { AnyBlock } from "../../blocks/Block"
import type { BaseLayouter } from "../Layouters/BaseLayouter"

import "../../inputs/PrismKotlinEditor"
import "../../inputs/SimpleInputElement"
import "../../drag/TapOrDragLayer"
import { createRef, type Ref } from "lit/directives/ref.js"
import { isSafari } from "../../util/browserCheck"

export abstract class BaseBlockRenderer {
  blockRegistry: BlockRegistry
  layouter: BaseLayouter

  protected _workspaceScaleFactor = 1
  protected _safariTransform = ""
  public setWorkspaceScaleFactor(value: number) {
    this._workspaceScaleFactor = value
    this._safariTransform = isSafari
      ? `position: fixed; transform: scale(${1 / this._workspaceScaleFactor}); transform-origin: 0 0;`
      : ""
  }

  constructor(blockRegistry: BlockRegistry, layouter: BaseLayouter) {
    this.blockRegistry = blockRegistry
    this.layouter = layouter
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
    const size = this.blockRegistry.getSize(block)
    const position = this.blockRegistry.getPosition(block)

    return this.draggableContainer(
      block.id,
      this.determineRenderOffset(block, ref),
      block.draggable,
      () =>
        this.renderBlockElement(block, size, position, (next: AnyBlock) =>
          this.renderBlock(next, block)
        )
    )
  }

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

  protected abstract renderBlockElement(
    block: AnyBlock,
    size: SizeProps,
    position: Coordinates,
    renderConnected: (block: AnyBlock) => TemplateResult<2>
  ): TemplateResult<2>

  //#endregion

  private determineRenderOffset(block: AnyBlock, ref: AnyBlock | Coordinates): Coordinates {
    if (ref instanceof Coordinates) return ref
    else
      return Coordinates.subtract(
        this.blockRegistry.getPosition(block),
        this.blockRegistry.getPosition(ref)
      )
  }
}

export type BlockRendererConstructorType = {
  new (blockRegistry: BlockRegistry, layouter: BaseLayouter): BaseBlockRenderer
}
