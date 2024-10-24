import { html, LitElement, svg, type TemplateResult } from "lit"
import { customElement, property } from "lit/decorators.js"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { Coordinates } from "../util/Coordinates"
import type { SizeProps } from "./SizeProps"
import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/BlockType"

@customElement("renderer-base")
export abstract class BaseRenderer extends LitElement {
  blockRegistry: BlockRegistry

  constructor(blockRegistry: BlockRegistry) {
    super()
    this.blockRegistry = blockRegistry
  }

  render() {}

  protected measureAllAndSet() {
    for (const leaf of this.blockRegistry.leafs) {
      this.blockRegistry.setSize(leaf, this.measureBlock(leaf))
      this.measureUpstreamAndSet(leaf)
    }
  }

  protected measureUpstreamAndSet(from: Block) {
    const upstream = from.upstream
    if (!upstream) throw new Error("Block has no upstream")
    if (upstream.type == BlockType.Root) return
    if (!this.blockRegistry.allConnectedBlocksMeasuredAndValid(upstream)) return
    this.blockRegistry.setSize(upstream, this.measureBlock(upstream))
    this.measureUpstreamAndSet(upstream)
  }

  protected abstract measureBlock(block: Block): SizeProps

  protected renderBlock(block: Block): TemplateResult<2> {
    
  }

  protected draggableContainer(
    blockId: string,
    translate: Coordinates,
    draggable: boolean = true,
    child: () => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
    <g class="${draggable ? "dragable" : "nodrag"}" transform="translate(${translate.x}, ${translate.y})" id="block-${blockId}"}>
      ${child()}
    </g>`
  }

  protected abstract renderBlockElement(blockId: string): TemplateResult<2>
}
