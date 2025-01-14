import { noChange, nothing, svg, type TemplateResult } from "lit"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import type { AnyBlock } from "../../blocks/Block"
import { Coordinates } from "../../util/Coordinates"
import type { Connection } from "../../connections/Connection"
import { ConnectorType } from "../../connections/ConnectorType"
import type { Connector } from "../../connections/Connector"
import type { BaseBlockRenderer } from "../BlockRenderers/BaseBlockRenderer"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import { guard } from "lit/directives/guard.js"

/**
 * The DragRenderer renders a currently dragged block and potential snap connection
 * It relies on a BlockRenderer to render the actual block element
 */
export abstract class BaseDragRenderer {
  protected readonly blockRegistry: BlockRegistry
  private readonly blockRenderer: BaseBlockRenderer

  constructor(blockRegistry: BlockRegistry, blockRenderer: BaseBlockRenderer) {
    this.blockRegistry = blockRegistry
    this.blockRenderer = blockRenderer
  }

  private dragged: AnyRegisteredBlock | null = null
  private snap: Connection | null = null
  private position = Coordinates.zero

  /**
   * Update the dragged block, position and snap connection.
   * This must be called every time the dragged block is moved,
   * along with an update request on the layer this is beig rendered in.
   * @param dragged
   * @param position
   * @param snap
   */
  update(dragged: AnyRegisteredBlock, position: Coordinates, snap: Connection | null) {
    this.dragged = dragged
    this.position = position
    this.snap = snap
  }

  /**
   * Remove the dragged block from the renderer.
   * An update must be requested on the layer this is being rendered in.
   */
  remove() {
    this.dragged = null
    this.position = Coordinates.zero
  }

  /**
   * Render the dragged block and snap connection if available.
   * @returns
   */
  render() {
    if (this.dragged == null) return nothing

    return [
      // pointer-events="none" is required to detect dropping on the drawer
      svg`<g pointer-events="none" transform="translate(${this.position.x}, ${this.position.y})">${guard(
        this.dragged.block.id,
        () =>
          this.blockRenderer.renderBlock(this.dragged!.block, Coordinates.zero, {
            level: 0,
            tabindex: -1,
          })
      )}</g>`,
      this.renderSnap(),
    ]
  }

  /**
   * Render a snap indicator if a connection available, depending on the type of snap.
   * Snap indicators will be rendered on top of the dragged block.
   * @returns
   */
  protected renderSnap() {
    if (this.snap == null || this.dragged == null) return nothing
    if (this.snap.to.parentBlock == null) throw new Error("Snap has no parent block")

    switch (this.snap.to.type) {
      case ConnectorType.After:
        return this.renderAfterSnap(
          this.dragged,
          this.snap.from,
          this.snap.to.parentBlock,
          this.snap.to
        )
      case ConnectorType.Before:
        return this.renderBeforeSnap(
          this.dragged,
          this.snap.from,
          this.snap.to.parentBlock,
          this.snap.to
        )
      case ConnectorType.Inner:
        return this.renderInnerSnap(
          this.dragged,
          this.snap.from,
          this.snap.to.parentBlock,
          this.snap.to
        )
      case ConnectorType.Extension:
        return this.renderExtensionSnap(
          this.dragged,
          this.snap.from,
          this.snap.to.parentBlock,
          this.snap.to
        )
      default:
        return nothing
    }
  }

  /**
   * Render a snap indicator for a connection to a **before** connector.
   * Snap indicators will be rendered on top of the dragged block.
   * @param localRegistered registered block that is being dragged
   * @param localConnector affected connector of the dragged block
   * @param remoteBlock block that can be snapped to
   * @param remoteConnector connector that can be snapped to
   */
  protected abstract renderBeforeSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>

  /**
   * Render a snap indicator for a connection to an **after** connector.
   * Snap indicators will be rendered on top of the dragged block.
   * @param localRegistered registered block that is being dragged
   * @param localConnector affected connector of the dragged block
   * @param remoteBlock block that can be snapped to
   * @param remoteConnector connector that can be snapped to
   */
  protected abstract renderAfterSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>

  /**
   * Render a snap indicator for a connection to an **inner** connector.
   * Snap indicators will be rendered on top of the dragged block.
   * @param localRegistered registered block that is being dragged
   * @param localConnector affected connector of the dragged block
   * @param remoteBlock block that can be snapped to
   * @param remoteConnector connector that can be snapped to
   */
  protected abstract renderInnerSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>

  /**
   * Render a snap indicator for a connection to an **extension** connector.
   * Snap indicators will be rendered on top of the dragged block.
   * @param localRegistered registered block that is being dragged
   * @param localConnector affected connector of the dragged block
   * @param remoteBlock block that can be snapped to
   * @param remoteConnector connector that can be snapped to
   */
  protected abstract renderExtensionSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>
}

export type DragRendererConstructorType = {
  new (blockRegistry: BlockRegistry, blockRenderer: BaseBlockRenderer): BaseDragRenderer
}
