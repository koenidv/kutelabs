import { svg, type TemplateResult } from "lit"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import { Coordinates } from "../../util/Coordinates"
import { SizeProps } from "../SizeProps"
import type { AnyBlock } from "../../blocks/Block"
import { BlockType } from "../../blocks/BlockType"
import type { Connector } from "../../connections/Connector"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"

export abstract class BaseBlockRenderer {
  blockRegistry: BlockRegistry

  constructor(blockRegistry: BlockRegistry) {
    this.blockRegistry = blockRegistry
  }

  render(): TemplateResult<2>[] {
    this.init()
    return this.renderFromRoot()
  }

  protected init() {
    this.measureSetAll()
    this.calculatePositionsFromRoot()
  }

  //#region Measure block sizes

  protected measureSetAll() {
    for (const leaf of this.blockRegistry.leafs) {
      this.blockRegistry.setSize(leaf, this.measureBlock(leaf))
      this.measureSetUpstream(leaf)
    }
  }

  protected measureSetUpstream(from: AnyBlock) {
    const upstream = from.upstream
    if (!upstream) throw new Error("Block has no upstream")
    if (upstream.type == BlockType.Root) return
    if (!this.blockRegistry.allConnectedBlocksMeasuredAndValid(upstream)) return
    this.blockRegistry.setSize(upstream, this.measureBlock(upstream))
    this.measureSetUpstream(upstream)
  }

  abstract measureBlock(block: AnyBlock): SizeProps

  //#endregion

  //#region Calculate positions

  protected calculatePositionsFromRoot() {
    this.blockRegistry.root?.blocks.forEach(({ block, position }) => {
      this.setPositionsRecursive(block, position)
    })
  }

  protected setPositionsRecursive(forBlock: AnyBlock, blockPosition: Coordinates) {
    const registered = this.blockRegistry.setPosition(forBlock, blockPosition)
    this.setConnectorPositions(registered)

    forBlock.downstreamWithConnectors.forEach(
      ({ block: connectedBlock, connector }) => {
        const connectedSize = this.blockRegistry.getSize(connectedBlock)

        this.setPositionsRecursive(
          connectedBlock,
          this.calculateBlockPosition(
            connectedBlock,
            connectedSize,
            registered,
            connector
          )
        )
      }
    )
  }

  protected setConnectorPositions(registeredBlock: AnyRegisteredBlock) {
    if (registeredBlock.size == null) throw new Error("Block size is not set")
    registeredBlock.block.connectors.all.forEach(connector => {
      const connectorOffset = this.calculateConnectorOffset(
        connector,
        registeredBlock.block,
        registeredBlock.globalPosition,
        registeredBlock.size!
      )
      connector.globalPosition = Coordinates.add(
        registeredBlock.globalPosition,
        connectorOffset
      )
    })
  }

  protected abstract calculateBlockPosition(
    block: AnyBlock,
    size: SizeProps,
    registeredParent: AnyRegisteredBlock,
    parentConnector: Connector
  ): Coordinates

  protected abstract calculateConnectorOffset(
    connector: Connector,
    block: AnyBlock,
    blockPosition: Coordinates,
    blockSize: SizeProps
  ): Coordinates

  //#endregion

  //#region Render blocks

  protected renderFromRoot(): TemplateResult<2>[] {
    if (this.blockRegistry.root == null)
      throw new Error("Cannot render; root is not set")
    return this.blockRegistry.root.blocks.map(({ block, position }) => {
      return this.renderBlock(block, null, position)
    })
  }

  public renderBlock(
    block: AnyBlock,
    previousBlock: AnyBlock | null,
    translatePosition: Coordinates | null = null
  ): TemplateResult<2> {
    const size = this.blockRegistry.getSize(block)
    const position = this.blockRegistry.getPosition(block)

    return this.draggableContainer(
      block.id,
      this.determineRenderOffset(block, previousBlock, translatePosition),
      block.draggable,
      () =>
        this.renderBlockElement(
          block,
          size,
          position,
          (next: AnyBlock) => this.renderBlock(next, block)
        )
    )
  }

  protected determineRenderOffset(
    block: AnyBlock,
    previousBlock: AnyBlock | null,
    translatePosition: Coordinates | null
  ): Coordinates {
    if (previousBlock == null && translatePosition == null)
      throw new Error("Either previous block or translate position must be set")

    return (
      translatePosition ??
      Coordinates.subtract(
        this.blockRegistry.getPosition(block),
        this.blockRegistry.getPosition(previousBlock!)
      )
    )
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
    block: AnyBlock,
    size: SizeProps,
    position: Coordinates,
    renderConnected: (block: AnyBlock) => TemplateResult<2>
  ): TemplateResult<2>

  //#endregion
}
