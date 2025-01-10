import { html, nothing, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import { BlockRegistry } from "../../registries/BlockRegistry"
import type { BlockAndCoordinates } from "../../util/Coordinates"
import type { BaseBlockRenderer } from "../BlockRenderers/BaseBlockRenderer"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import type { BlockAndSize } from "../SizeProps"

export type BlockSizeCount = BlockAndSize & { count: number }
export type BlockCoordinateCount = BlockAndCoordinates & { count: number }

export abstract class BaseDrawerRenderer {
  private readonly blockRegistry: BlockRegistry
  private readonly layouter: BaseLayouter
  private readonly blockRenderer: BaseBlockRenderer
  private readonly requestUpdate: () => void

  private _enabled = true
  public set enabled(value: boolean) {
    this._enabled = value
  }

  protected expanded = true
  public setExpanded(value: boolean) {
    this.expanded = value
  }

  minWidth = 150
  maxWidth = 150

  constructor(
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    blockRenderer: BaseBlockRenderer,
    requestUpdate: () => void,
    enabled = true
  ) {
    this.blockRegistry = blockRegistry
    this.layouter = layouter
    this.blockRenderer = blockRenderer
    this.requestUpdate = requestUpdate
    this._enabled = enabled
  }

  public renderElement(): TemplateResult<1> | typeof nothing {
    if (!this._enabled || !this.blockRegistry.drawer) return nothing

    const blocks = this.blockRegistry.drawer.blocks
    const ordered = this.orderBlocks(blocks)
    const withSize = this.measureAndSet(ordered)
    const layout = this.positionAndSet(withSize)
    const width = this.expanded ? Math.max(layout.fullWidth, this.minWidth) : 0

    return html`
      ${this.expanded
        ? html`
            <div
              id="drawer-container"
              style="position: absolute; top: 0; left:0; bottom: 0; overflow: auto;">
              <svg
                id="drawer"
                id="drawer-content"
                width="${width}"
                height="${layout.fullHeight}"
                style="min-height: 100%; display: block;"
                role="list">
                ${this.renderDrawer(
                  layout.positions,
                  width,
                  layout.fullHeight,
                  this.blockRenderer.renderBlock.bind(this.blockRenderer)
                )}
              </svg>
            </div>
          `
        : nothing}

      <div id="drawer" style="position: absolute; top: 0; left: ${width}px">
        ${this.renderExpandButton(this.expanded, (evt: Event) => {
          if (evt.defaultPrevented) return
          evt.preventDefault()
          this.expanded = !this.expanded
          this.requestUpdate()
        })}
      </div>
    `
  }

  private measureAndSet(blocks: { block: AnyBlock; count: number }[]): BlockSizeCount[] {
    return blocks.map(({ block, count }) => {
      const size = this.layouter.measureBlock(block)
      const fullWidth = size.fullWidth
      if (fullWidth > this.maxWidth) {
        size.widths = size.widths.map(it => ({
          prop: it.prop,
          value: (it.value * this.maxWidth) / fullWidth,
        }))
      }
      this.blockRegistry.setSize(block, size)
      return { block, size, count }
    })
  }

  private positionAndSet(blocks: BlockSizeCount[]): {
    positions: BlockCoordinateCount[]
    fullWidth: number
    fullHeight: number
  } {
    const calculated = this.calculatePositions(blocks)
    calculated.positions.forEach(it => {
      const registered = this.blockRegistry.setPosition(it.block, it.position)
      this.layouter.setConnectorPositions(registered)
    })
    return calculated
  }

  protected orderBlocks(
    blocks: { block: AnyBlock; count: number }[]
  ): { block: AnyBlock; count: number }[] {
    return blocks
  }

  protected abstract calculatePositions(blocks: BlockSizeCount[]): {
    positions: BlockCoordinateCount[]
    fullWidth: number
    fullHeight: number
  }

  protected abstract renderDrawer(
    blocks: BlockCoordinateCount[],
    contentWidth: number,
    contentHeight: number,
    renderBlock: typeof BaseBlockRenderer.prototype.renderBlock
  ): TemplateResult<2>

  protected abstract renderExpandButton(
    expanded: boolean,
    toggle: (evt: Event) => void
  ): TemplateResult<1>
}

export type DrawerRendererConstructorType = {
  new (
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    blockRenderer: BaseBlockRenderer,
    requestUpdate: () => void,
    enabled?: boolean
  ): BaseDrawerRenderer
}
