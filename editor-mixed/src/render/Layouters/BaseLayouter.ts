import type { AnyBlock } from "../../blocks/Block"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { Connector } from "../../connections/Connector"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import type { SizeProps } from "../SizeProps"

/**
 * The Layouter measures and positions blocks
 */
export abstract class BaseLayouter {
  blockRegistry: BlockRegistry

  constructor(blockRegistry: BlockRegistry) {
    this.blockRegistry = blockRegistry
  }

  //#region Measure block sizes

  /**
   * Measures all registered blocks, beginning from each leaf and working upstream
   * A block's size might be dependent on the size of its connected blocks
   */
  public measureSetAll() {
    for (const leaf of this.blockRegistry.leafs) {
      this.blockRegistry.setSize(leaf, this.measureBlock(leaf))
      this.measureSetUpstream(leaf)
    }
  }

  /**
   * Measures the next connected upstream block
   * The upstream block will only be measured if all downstream blocks are
   * already measured and valid, otherwise this will fail silently
   * @param from Measured block with a block connected upstream
   */
  protected measureSetUpstream(from: AnyBlock) {
    const upstream = from.upstream
    if (!upstream) throw new Error("Block has no upstream")
    if (upstream.type == BlockType.Root) return
    if (!this.blockRegistry.downstreamBlocksMeasuredAndValid(upstream)) return
    this.blockRegistry.setSize(upstream, this.measureBlock(upstream))
    this.measureSetUpstream(upstream)
  }

  /**
   * Accumulates the height of all blocks in an after-chain
   * @param block Block to start accumulating from
   * @returns Height of the stack from the block
   */
  protected getMeasuredStackHeight(block: AnyBlock): number {
    let height = this.blockRegistry.getSize(block).fullHeight
    let after = block.after
    while (after != null) {
      height += this.blockRegistry.getSize(after).fullHeight
      after = after.after
    }
    return height
  }

  /**
   * Measures a Block
   * @param block Block to measure
   * @returns Size of the block as @see{SizeProps}
   */
  abstract measureBlock(block: AnyBlock): SizeProps

  //#region Calculate positions

  /**
   * Calculates the global positions of all registered blocks, beginning from the root
   */
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
}

export type LayouterConstructorType = {
  new (blockRegistry: BlockRegistry): BaseLayouter
}
