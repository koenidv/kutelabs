import { svg, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import { BaseDrawerRenderer } from "./BaseDrawerRenderer"
import { Coordinates, type BlockAndCoordinates } from "../../util/Coordinates"
import type { BlockAndSize, SizeProps } from "../SizeProps"

export class DebugDrawerRenderer extends BaseDrawerRenderer {
  calculatePositions(blockSizes: BlockAndSize[]): {
    positions: BlockAndCoordinates[]
    fullWidth: number
    fullHeight: number
  } {
    let nextY = 25
    const positions = blockSizes.map(({ block, size }) => {
      const position = new Coordinates(25, nextY)
      nextY += size.fullHeight + 25
      return { block, position }
    })

    return {
      positions,
      fullWidth:
        blockSizes.reduce(
          (acc, curr) => Math.max(acc, curr.size.fullWidth),
          0
        ) + 50,
      fullHeight: nextY,
    }
  }

  renderDrawer(
    blocks: BlockAndCoordinates[],
    renderBlock: (block: AnyBlock, position: Coordinates) => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
      <g>
        <rect width="150" height="100%" fill="#efefef" stroke="black" stroke-width="0.5" />
        ${blocks.map(it => renderBlock(it.block, it.position))}
      </g>
    `
  }
}
