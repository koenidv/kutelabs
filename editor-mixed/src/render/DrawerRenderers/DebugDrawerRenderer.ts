import { svg, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import {
  BaseDrawerRenderer,
  type BlockCoordinateCount,
  type BlockSizeCount,
} from "./BaseDrawerRenderer"
import { Coordinates } from "../../util/Coordinates"

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
    renderBlock: (block: AnyBlock, position: Coordinates) => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
      <g>
        <rect width="${Math.max(contentWidth, this.minWidth)}" height="100%" fill="#efefef" stroke="black" stroke-width="0.5" />

        ${blocks.map(
          it => svg`
            <g transform="translate(${it.position.x}, ${it.position.y})">
              ${renderBlock(it.block, Coordinates.zero)}
              <text x="0", y="0" width="100" height="100" stroke="pink">${it.count}</text>
            </g>
          `
        )}
      </g>
    `
  }
}
