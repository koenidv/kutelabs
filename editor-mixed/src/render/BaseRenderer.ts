import { LitElement, svg, type TemplateResult } from "lit"
import { customElement } from "lit/decorators.js"
import type { BlockRegistry } from "../registries/BlockRegistry"
import type { Coordinates } from "../util/Coordinates"
import type { SizeProps } from "./SizeProps"
import type { Block } from "../blocks/Block"
import { BlockType } from "../blocks/BlockType"
import type { Connector } from "../connections/Connector"
import type { RegisteredBlock } from "../registries/RegisteredBlock"

@customElement("renderer-base")
export abstract class BaseRenderer extends LitElement {
  blockRegistry: BlockRegistry

  constructor(blockRegistry: BlockRegistry) {
    super()
    this.blockRegistry = blockRegistry
  }

  render() {}

  protected init() {
    this.measureSetAll()
  }

  //#region Measure block sizes

  protected measureSetAll() {
    for (const leaf of this.blockRegistry.leafs) {
      this.blockRegistry.setSize(leaf, this.measureBlock(leaf))
      this.measureSetUpstream(leaf)
    }
  }

  protected measureSetUpstream(from: Block) {
    const upstream = from.upstream
    if (!upstream) throw new Error("Block has no upstream")
    if (upstream.type == BlockType.Root) return
    if (!this.blockRegistry.allConnectedBlocksMeasuredAndValid(upstream)) return
    this.blockRegistry.setSize(upstream, this.measureBlock(upstream))
    this.measureSetUpstream(upstream)
  }

  protected abstract measureBlock(
    block: Block
  ): SizeProps

  //#endregion

  //#region Calculate block positions

  protected calculatePositionsFromRoot() {
    this.blockRegistry.root?.blocks.forEach(({ block, position }) => {
      this.setPositionsRecursive(block, position)
    })
  }

  protected setPositionsRecursive(forBlock: Block, blockPosition: Coordinates) {
    const registered = this.blockRegistry.setPosition(forBlock, blockPosition)
    this.setConnectorPositions(registered)

    forBlock.connectedBlocks.blocks.forEach((connectedBlock, connector) => {
      this.setPositionsRecursive(
        connectedBlock,
        this.calculateBlockPosition(connector)
      )
    })
  }

  protected setConnectorPositions(registeredBlock: RegisteredBlock) {
    if (registeredBlock.size == null) throw new Error("Block size is not set")
    registeredBlock.block.connectors.all.forEach(connector => {
      const connectorPosition = this.calculateConnectorPosition(
        connector,
        registeredBlock.globalPosition,
        registeredBlock.size!
      )
      connector.globalPosition = connectorPosition
    }
  }

  protected abstract calculateBlockPosition(
    onConnector: Connector
  ): Coordinates

  protected abstract calculateConnectorPosition(
    connector: Connector,
    blockPosition: Coordinates,
    blockSize: SizeProps
  ): Coordinates

  //#endregion


  //#region Render blocks

  protected renderBlock(block: Block): TemplateResult<2> {
    const size = this.blockRegistry.getSize(block)
    //todo
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

  protected abstract renderBlockElement(
    block: Block,
    size: SizeProps
  ): TemplateResult<2>

  //#endregion
}
