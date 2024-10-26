import { css, html, LitElement, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import type { AbstractRenderer } from "./render/AbstractRenderer"
import { DebugRenderer } from "./render/BlockRenderers/DebugRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { Block } from "./blocks/Block"
import { BlockType } from "./blocks/BlockType"
import { Connector } from "./connections/Connector"
import { ConnectorType } from "./connections/ConnectorType"
import { Coordinates } from "./util/Coordinates"
import { ExtrasRenderer } from "./render/ExtrasRenderer"
import { DragHelper } from "./drag/DragHelper"
import { DragRenderer } from "./render/DragRenderer"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  renderer: AbstractRenderer
  extrasRenderer: ExtrasRenderer
  dragRenderer: DragRenderer
  dragHelper: DragHelper

  constructor() {
    super()
    BlockRegistry.instance.initRoot()

    this.renderer = new DebugRenderer(BlockRegistry.instance)
    this.extrasRenderer = new ExtrasRenderer()
    this.dragRenderer = new DragRenderer(
      (block: Block, position: Coordinates) =>
        this.renderer.renderBlock(
          block,
          null,
          position
        )
    )
    this.dragHelper = new DragHelper(this.dragRenderer, this.requestUpdate.bind(this))

    this.addDebugBlocks()
  }

  private addDebugBlocks() {
    const block1 = new Block(
      null,
      BlockType.Expression,
      [new Connector(ConnectorType.Before), new Connector(ConnectorType.After)],
      true
    )
    BlockRegistry.instance.attachToRoot(block1, () => new Coordinates(100, 200))
    new Block(
      block1,
      BlockType.Expression,
      [new Connector(ConnectorType.Before), new Connector(ConnectorType.After)],
      true
    )
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
