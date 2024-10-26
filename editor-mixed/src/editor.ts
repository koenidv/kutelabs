import { css, html, LitElement, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import type { BaseBlockRenderer } from "./render/BlockRenderers/BaseBlockRenderer"
import { DebugBlockRenderer } from "./render/BlockRenderers/DebugBlockRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { Block } from "./blocks/Block"
import { BlockType } from "./blocks/BlockType"
import { Connector } from "./connections/Connector"
import { ConnectorType } from "./connections/ConnectorType"
import { Coordinates } from "./util/Coordinates"
import { ExtrasRenderer } from "./render/ExtrasRenderers.ts/ExtrasRenderer"
import { DragHelper } from "./drag/DragHelper"
import { DebugDragRenderer } from "./render/DragRenderers/DebugDragRenderer"
import type { BaseDragRenderer } from "./render/DragRenderers/BaseDragRenderer"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  renderer: BaseBlockRenderer
  extrasRenderer: ExtrasRenderer
  dragRenderer: BaseDragRenderer
  dragHelper: DragHelper

  constructor() {
    super()
    BlockRegistry.instance.initRoot()

    this.renderer = new DebugBlockRenderer(BlockRegistry.instance)
    this.extrasRenderer = new ExtrasRenderer()
    this.dragRenderer = new DebugDragRenderer(
      (block: Block, position: Coordinates) =>
        this.renderer.renderBlock(block, null, position)
    )
    this.dragHelper = new DragHelper(
      this.dragRenderer,
      this.requestUpdate.bind(this)
    )

    this.addDebugBlocks()
  }

  private addDebugBlocks() {
    const block1 = new Block(
      null,
      BlockType.Expression,
      [
        new Connector(ConnectorType.Before),
        new Connector(ConnectorType.After),
        new Connector(ConnectorType.Extension),
      ],
      true
    )
    BlockRegistry.instance.attachToRoot(block1, () => new Coordinates(100, 200))
    new Block(
      block1,
      BlockType.Expression,
      [
        new Connector(ConnectorType.Before),
        new Connector(ConnectorType.After),
        new Connector(ConnectorType.Extension),
        new Connector(ConnectorType.Inner),
      ],
      true
    )
    const block3 = new Block(
      null,
      BlockType.Input,
      [new Connector(ConnectorType.Before)],
      true
    )
    BlockRegistry.instance.attachToRoot(block3, () => new Coordinates(300, 300))
  }

  protected render() {
    return html`
      <svg
        class="editorContainer"
        @mousedown="${(e: MouseEvent) => this.dragHelper.startDrag(e)}"
        @mousemove="${(e: MouseEvent) => this.dragHelper.drag(e)}"
        @mouseup="${(e: MouseEvent) => this.dragHelper.endDrag(e)}"
        @mouseleave="${(e: MouseEvent) => this.dragHelper.endDrag(e)}">
        ${this.extrasRenderer.renderBackground()} ${this.renderer.render()}
        ${this.dragRenderer.render()}
      </svg>
    `
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)
    this.dragHelper.observed = this.shadowRoot!.querySelector("svg")
  }

  static styles = css`
    .editorContainer {
      height: 80vh;
      width: 80vw;
      border: 1px solid black;
    }
  `
}
