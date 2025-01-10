import { html, svg, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import {
  BaseDrawerRenderer,
  type BlockCoordinateCount,
  type BlockSizeCount,
} from "./BaseDrawerRenderer"
import { Coordinates } from "../../util/Coordinates"
import type { BaseBlockRenderer } from "../BlockRenderers/BaseBlockRenderer"

export class DebugDrawerRenderer extends BaseDrawerRenderer {
  calculatePositions(blockSizes: BlockSizeCount[]): {
    positions: BlockCoordinateCount[]
    fullWidth: number
    fullHeight: number
  } {
    let nextY = 25
    const positions = blockSizes.map(({ block, size, count }) => {
      const position = new Coordinates(25, nextY)
      nextY += size.fullHeight + 25
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
              <text x="0", y="0" width="100" height="100" stroke="pink">${it.count}</text>
            </g>
          `
        )}
    `
  }

  protected renderExpandButton(expanded: boolean, toggle: (evt: Event) => void): TemplateResult<1> {
    if (expanded)
      return html`<svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        @mousedown=${toggle}
        @touchstart=${toggle}
        @keydown=${(evt: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") toggle(evt)
        }}
        role="button"
        tabindex="0"
        aria-label="Collapse Drawer">
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m14 5l-7 7l7 7" />
      </svg>`
    else
      return html`<svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        @mousedown=${toggle}
        @touchstart=${toggle}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") toggle()
        }}
        role="button"
        tabindex="0"
        aria-label="Expand Drawer">
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m10 5l7 7l-7 7" />
      </svg>`
  }
}
