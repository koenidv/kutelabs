import { html, svg, type TemplateResult } from "lit"
import { Coordinates } from "../../util/Coordinates"
import type { BaseBlockRenderer } from "../BlockRenderers/BaseBlockRenderer"
import {
  BaseDrawerRenderer,
  type BlockCoordinateCount,
  type BlockSizeCount,
} from "./BaseDrawerRenderer"
import type { AnyBlock } from "../../blocks/Block"
import { BlockType } from "../../blocks/configuration/BlockType"

export class KuteDrawerRenderer extends BaseDrawerRenderer {
  override maxWidth: number = 120
  itemGap = 20

  protected override orderBlocks(
    blocks: { block: AnyBlock; count: number }[]
  ): { block: AnyBlock; count: number }[] {
    return blocks.sort(
      (a, b) =>
        Object.values(BlockType).indexOf(a.block.type) -
        Object.values(BlockType).indexOf(b.block.type)
    )
  }

  calculatePositions(blockSizes: BlockSizeCount[]): {
    positions: BlockCoordinateCount[]
    fullWidth: number
    fullHeight: number
  } {
    let nextY = this.itemGap
    const positions = blockSizes.map(({ block, size, count }) => {
      const position = new Coordinates(25, nextY)
      nextY += size.fullHeight + this.itemGap
      return { block, position, count }
    })

    return {
      positions,
      fullWidth: blockSizes.reduce((acc, curr) => Math.max(acc, curr.size.fullWidth), 0) + 50,
      fullHeight: nextY,
    }
  }

  renderDrawer(
    blocks: BlockCoordinateCount[],
    contentWidth: number,
    _contentHeight: number,
    renderBlock: typeof BaseBlockRenderer.prototype.renderBlock
  ): TemplateResult<2> {
    return svg`
        <rect width="${Math.max(contentWidth, this.minWidth)}" height="100%" fill="#efefef" stroke="black" stroke-width="0.5" />

        ${blocks.map(
          (it, index) => svg`
            <g transform="translate(${it.position.x}, ${it.position.y})">
              ${renderBlock(it.block, Coordinates.zero, { tabindex: index, level: 0 })}
            </g>
          `
        )}
    `
  }

  protected renderExpandButton(expanded: boolean, toggle: (evt: Event) => void): TemplateResult<1> {
    const icon = expanded
      ? html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m14 5l-7 7l7 7" />
        </svg>`
      : html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="m10 5l7 7l-7 7" />
        </svg>`

    return html`
      <div
        class="expand-collapse"
        @mousedown=${toggle}
        @touchstart=${toggle}
        @keydown=${(evt: KeyboardEvent) => {
          if (evt.key === "Enter" || evt.key === " ") toggle(evt)
        }}
        role="button"
        tabindex="0"
        aria-label=${expanded ? "Collapse Drawer" : "Expand Drawer"}>
        ${icon}
      </div>

      <style>
        .expand-collapse {
          margin-top: 0.5rem;
          margin-left: 0.5rem;
          height: 2.25rem;
          width: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #808080;
          border-radius: 100%;
          background-color: #ffffffa0;
        }
        .control-zoom:hover {
          background-color: #dfdfdf;
          cursor: pointer;
        }
      </style>
    `
  }
}
