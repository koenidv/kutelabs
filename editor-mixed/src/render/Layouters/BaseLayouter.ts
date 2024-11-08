import type { AnyBlock } from "../../blocks/Block"
import { BlockType } from "../../blocks/BlockType"
import type { Connector } from "../../connections/Connector"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import type { SizeProps } from "../SizeProps"

export abstract class BaseLayouter {
  blockRegistry: BlockRegistry

  constructor(blockRegistry: BlockRegistry) {
    this.blockRegistry = blockRegistry
  }

  //#region Measure block sizes

  public measureSetAll() {
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

  protected getMeasuredStackHeight(block: AnyBlock): number {
    let height = this.blockRegistry.getSize(block).fullHeight
    let after = block.after
    while (after != null) {
      height += this.blockRegistry.getSize(after).fullHeight
      after = after.after
    }
    return height
  }

  abstract measureBlock(block: AnyBlock): SizeProps

  //#endregion

  //#region Calculate positions

  public calculatePositionsFromRoot() {
    this.blockRegistry.root?.blocks.forEach(({ block, position }) => {
      this.setPositionsRecursive(block, position)
    })
  }

  protected setPositionsRecursive(
    forBlock: AnyBlock,
    blockPosition: Coordinates
  ) {
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

  setConnectorPositions(registeredBlock: AnyRegisteredBlock) {
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
}
