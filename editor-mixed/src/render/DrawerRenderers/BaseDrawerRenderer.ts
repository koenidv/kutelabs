import { html, nothing, svg, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import type { BlockAndSize, SizeProps } from "../SizeProps"
import type { BlockAndCoordinates, Coordinates } from "../../util/Coordinates"
import { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"

export abstract class BaseDrawerRenderer {
  protected renderBlock: (
    block: AnyBlock,
    position: Coordinates
  ) => TemplateResult<2>
  protected measureBlock: (block: AnyBlock) => SizeProps
  private setConnectorPositions: (registered: AnyRegisteredBlock) => void

  constructor(
    renderBlock: (block: AnyBlock, position: Coordinates) => TemplateResult<2>,
    measureBlock: (block: AnyBlock) => SizeProps,
    setConnectorPositions: (registered: AnyRegisteredBlock) => void
  ) {
    this.renderBlock = renderBlock
    this.measureBlock = measureBlock
    this.setConnectorPositions = setConnectorPositions
  }

  public renderElement(): TemplateResult<1> | typeof nothing {
    if (!BlockRegistry.instance.drawer) return nothing

    const blocks = BlockRegistry.instance.drawer.blocks
    const withSize = this.measureAndSet(blocks)
    const layout = this.positionAndSet(withSize)

    return html`
      <svg
        id="drawer"
        width="${layout.fullWidth}"
        height="${layout.fullHeight}"
        style="min-height: 100%; display: block;">
        ${this.renderDrawer(layout.positions, this.renderBlock)}
      </svg>
    `
  }

  private measureAndSet(blocks: AnyBlock[]): BlockAndSize[] {
    return blocks.map(block => {
      const size = this.measureBlock(block)
      BlockRegistry.instance.setSize(block, size)
      return { block, size }
    })
  }

  private positionAndSet(blocks: BlockAndSize[]): {
    positions: BlockAndCoordinates[]
    fullWidth: number
    fullHeight: number
  } {
    const calculated = this.calculatePositions(blocks)
    calculated.positions.forEach(it => {
      const registered = BlockRegistry.instance.setPosition(
        it.block,
        it.position
      )
      this.setConnectorPositions(registered)
    })
    return calculated
  }

  protected abstract calculatePositions(blocks: BlockAndSize[]): {
    positions: BlockAndCoordinates[]
    fullWidth: number
    fullHeight: number
  }

  protected abstract renderDrawer(
    blocks: BlockAndCoordinates[],
    renderBlock: (block: AnyBlock, position: Coordinates) => TemplateResult<2>
  ): TemplateResult<2>
}
