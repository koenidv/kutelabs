import { svg, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import type { BlockAndCoordinates } from "../../blocks/RootBlock"
import { BaseDrawerRenderer } from "./BaseDrawerRenderer"
import { Coordinates } from "../../util/Coordinates"

export class DebugDrawerRenderer extends BaseDrawerRenderer {
  calculatePositions(blocks: AnyBlock[]): BlockAndCoordinates[] {
    let nextY = 25
    return blocks.map(block => {
      const position = new Coordinates(25, nextY)
      nextY += this.measureBlock(block).fullHeight + 25
      return { block, position }
    })
  }
  renderDrawer(blocks: BlockAndCoordinates[]): TemplateResult<2> {
    return svg`
      <g>
        <rect width="150" height="100%" fill="#efefef" stroke="black" stroke-width="0.5" />
        ${blocks.map(it => this.renderBlock(it.block, it.position))}
      </g>
    `
  }
}
