import { html, nothing, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import type { BlockAndSize } from "../SizeProps"
import type { BlockAndCoordinates, Coordinates } from "../../util/Coordinates"
import { BlockRegistry } from "../../registries/BlockRegistry"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import type { BaseBlockRenderer } from "../BlockRenderers/BaseBlockRenderer"

export type BlockSizeCount = BlockAndSize & { count: number }
export type BlockCoordinateCount = BlockAndCoordinates & { count: number }

export abstract class BaseDrawerRenderer {
  private readonly blockRegistry: BlockRegistry
  private readonly layouter: BaseLayouter
  private readonly blockRenderer: BaseBlockRenderer

  private _enabled = true
  public set enabled(value: boolean) {
    this._enabled = value
  }

  minWidth = 150

  constructor(
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    blockRenderer: BaseBlockRenderer,
    enabled = true
  ) {
    this.blockRegistry = blockRegistry
    this.layouter = layouter
    this.blockRenderer = blockRenderer
    this._enabled = enabled
  }

  public renderElement(): TemplateResult<1> | typeof nothing {
    if (!this._enabled || !this.blockRegistry.drawer) return nothing

    const blocks = this.blockRegistry.drawer.blocks
    const withSize = this.measureAndSet(blocks)
    const layout = this.positionAndSet(withSize)

    return html`
      <svg
        id="drawer"
        width="${Math.max(layout.fullWidth, this.minWidth)}"
        height="${layout.fullHeight}"
        style="min-height: 100%; display: block;">
        ${this.renderDrawer(
          layout.positions,
          layout.fullWidth,
          layout.fullHeight,
          this.blockRenderer.renderBlock.bind(this.blockRenderer)
        )}
      </svg>
    `
  }

  private measureAndSet(blocks: { block: AnyBlock; count: number }[]): BlockSizeCount[] {
    return blocks.map(({ block, count }) => {
      const size = this.layouter.measureBlock(block)
      console.log(block)
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

  protected abstract calculatePositions(blocks: BlockSizeCount[]): {
    positions: BlockCoordinateCount[]
    fullWidth: number
    fullHeight: number
  }

  protected abstract renderDrawer(
    blocks: BlockCoordinateCount[],
    contentWidth: number,
    contentHeight: number,
    renderBlock: (block: AnyBlock, position: Coordinates) => TemplateResult<2>
  ): TemplateResult<2>
}

export type DrawerRendererConstructorType = {
  new (
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    blockRenderer: BaseBlockRenderer,
    enabled?: boolean
  ): BaseDrawerRenderer
}
