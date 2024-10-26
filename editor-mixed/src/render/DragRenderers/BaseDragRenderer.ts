import { nothing, svg, type TemplateResult } from "lit"
import type { RegisteredBlock } from "../../registries/RegisteredBlock"
import type { Block } from "../../blocks/Block"
import { Coordinates } from "../../util/Coordinates"
import type { Connection } from "../../connections/Connection"
import { ConnectorType } from "../../connections/ConnectorType"
import type { Connector } from "../../connections/Connector"

export abstract class BaseDragRenderer {
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
  private snap: Connection | null = null
  private position = Coordinates.zero

  update(
    dragged: RegisteredBlock,
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
      this._renderBlock(this.dragged.block, this.position),
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
      default:
        return nothing
    }
  }

  protected abstract renderBeforeSnap(
    localRegistered: RegisteredBlock,
    localConnector: Connector,
    remoteBlock: Block,
    remoteConnector: Connector
  ): TemplateResult<2>

  protected abstract renderAfterSnap(
    localRegistered: RegisteredBlock,
    localConnector: Connector,
    remoteBlock: Block,
    remoteConnector: Connector
  ): TemplateResult<2>

  protected abstract renderInnerSnap(
    localRegistered: RegisteredBlock,
    localConnector: Connector,
    remoteBlock: Block,
    remoteConnector: Connector
  ): TemplateResult<2>

  protected abstract renderExtensionSnap(
    localRegistered: RegisteredBlock,
    localConnector: Connector,
    remoteBlock: Block,
    remoteConnector: Connector
  ): TemplateResult<2>
}
