import { svg, type TemplateResult } from "lit"
import type { AnyBlock, Block } from "../../blocks/Block"
import type { Connector } from "../../connections/Connector"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"
import { BaseDragRenderer } from "./BaseDragRenderer"
import { BlockRegistry } from "../../registries/BlockRegistry"

export class DebugDragRenderer extends BaseDragRenderer {
  protected renderAfterSnap(
    _localRegistered: AnyRegisteredBlock,
    _localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2> {
    const width = BlockRegistry.instance.getSize(remoteBlock).fullWidth + 16
    const height = 32

    return svg`
        <rect width=${width} height=${height} x=${remoteConnector.globalPosition.x - 8} y=${remoteConnector.globalPosition.y - 16} fill="blue" opacity="0.5" stroke="black"/>
      `
  }

  protected renderBeforeSnap(localRegistered: RegisteredBlock, localConnector: Connector, remoteBlock: Block, remoteConnector: Connector): TemplateResult<2> {
    return this.renderAfterSnap(localRegistered, localConnector, remoteBlock, remoteConnector)
  }

  protected renderInnerSnap(
    localRegistered: AnyRegisteredBlock,
    localConnector: Connector,
    remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2> {
    return this.renderExtensionSnap(localRegistered, localConnector, remoteBlock, remoteConnector)
  }

  protected renderExtensionSnap(
    _localRegistered: AnyRegisteredBlock,
    _localConnector: Connector,
    _remoteBlock: AnyBlock,
    remoteConnector: Connector
  ): TemplateResult<2> {
    return svg`
        <rect width="32" height="32" x=${remoteConnector.globalPosition.x - 16} y=${remoteConnector.globalPosition.y - 16} fill="blue" opacity="0.5" stroke="black"/>
      `
  }
}
