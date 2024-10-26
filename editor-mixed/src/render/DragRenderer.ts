import { nothing, svg, type TemplateResult } from "lit"
import type { RegisteredBlock } from "../registries/RegisteredBlock"
import type { Block } from "../blocks/Block"
import { Coordinates } from "../util/Coordinates"

export class DragRenderer {
  private _renderBlock: (
    block: Block,
    position: Coordinates
  ) => TemplateResult<2>

  constructor(
    renderBlock: (block: Block, position: Coordinates) => TemplateResult<2>
  ) {
    this._renderBlock = renderBlock
  }

  private dragged: RegisteredBlock | null = null
  private x = 0
  private y = 0

  update(dragged: RegisteredBlock, x: number, y: number) {
    this.dragged = dragged
    this.x = x
    this.y = y
  }

  remove() {
    this.dragged = null
    this.x = 0
    this.y = 0
  }

  render() {
    if (this.dragged == null) return nothing
    return this._renderBlock(this.dragged.block, new Coordinates(this.x, this.y))
    // return svg`
    //   <g transform="translate(${this.x} ${this.y})">
    //     ${this._renderBlock(this.dragged.block, new Coordinates(this.x, this.y))}
    //   </g>
    // `
  }
}
