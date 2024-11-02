import { nothing, svg, type TemplateResult } from "lit"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import type { AnyBlock } from "../../blocks/Block"
import { Coordinates } from "../../util/Coordinates"
import type { Connection } from "../../connections/Connection"
import { ConnectorType } from "../../connections/ConnectorType"
import type { Connector } from "../../connections/Connector"

export abstract class BaseDragRenderer {
  private _renderBlock: (
    block: AnyBlock,
    position: Coordinates
  ) => TemplateResult<2>

  constructor(
    renderBlock: (block: AnyBlock, position: Coordinates) => TemplateResult<2>
  ) {
    this._renderBlock = renderBlock
  }

  private dragged: AnyRegisteredBlock | null = null
  private snap: Connection | null = null
  private position = Coordinates.zero

  update(
    dragged: AnyRegisteredBlock,
    position: Coordinates,
    snap: Connection | null
  ) {
    this.dragged = dragged
    this.position = position
    this.snap = snap
  }

  remove() {
    this.dragged = null
    this.position = Coordinates.zero
  }

  render() {
    if (this.dragged == null) return nothing
    return [
      // pointer-events="none" is required to detect dropping on the drawer
      svg`<g pointer-events="none">${this._renderBlock(this.dragged.block, this.position)}</g>`,
      this.renderSnap(),
    ]
  }

  protected renderSnap() {
    if (this.snap == null || this.dragged == null) return nothing
    if (this.snap.to.parentBlock == null)
      throw new Error("Snap has no parent block")

    // const dragOffset = Coordinates.subtract(
    //   this.position,
    //   this.dragged!.globalPosition
    // )

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

  protected abstract renderBeforeSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>

  protected abstract renderAfterSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>

  protected abstract renderInnerSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>

  protected abstract renderExtensionSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2>
}
