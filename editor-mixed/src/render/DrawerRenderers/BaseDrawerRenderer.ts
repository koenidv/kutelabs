import { nothing, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import type { BlockAndCoordinates } from "../../blocks/RootBlock"
import type { SizeProps } from "../SizeProps"
import type { Coordinates } from "../../util/Coordinates"
import { BlockRegistry } from "../../registries/BlockRegistry"

export abstract class BaseDrawerRenderer {
  protected renderBlock: (
    block: AnyBlock,
    position: Coordinates
  ) => TemplateResult<2>
  protected measureBlock: (block: AnyBlock) => SizeProps

  constructor(
    renderBlock: (block: AnyBlock, position: Coordinates) => TemplateResult<2>,
    measureBlock: (block: AnyBlock) => SizeProps
  ) {
    this.renderBlock = renderBlock
    this.measureBlock = measureBlock
  }

  public render(): TemplateResult<2> | typeof nothing {
    if (!BlockRegistry.instance.drawer) return nothing
    return this.renderDrawer(
      this.calculatePositions(
        BlockRegistry.instance.drawer.blocks.map(it => it.block)
      )
    )
  }

  protected abstract calculatePositions(
    blocks: AnyBlock[]
  ): BlockAndCoordinates[]

  protected abstract renderDrawer(
    blocks: BlockAndCoordinates[]
  ): TemplateResult<2>
}
