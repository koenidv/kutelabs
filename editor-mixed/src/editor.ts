import { css, html, LitElement, svg, type TemplateResult } from "lit"
import { customElement, property } from "lit/decorators.js"
import type { AbstractRenderer } from "./render/AbstractRenderer"
import { DebugRenderer } from "./render/DebugRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { RootBlock } from "./blocks/RootBlock"
import { Block } from "./blocks/Block"
import { BlockType } from "./blocks/BlockType"
import { Connector } from "./connections/Connector"
import { ConnectorType } from "./connections/ConnectorType"
import { Coordinates } from "./util/Coordinates"
import { ExtrasRenderer } from "./render/ExtrasRenderer"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  rootBlock: RootBlock
  renderer: AbstractRenderer
  extrasRenderer: ExtrasRenderer

  constructor() {
    super()
    this.rootBlock = new RootBlock()
    BlockRegistry.instance.root = this.rootBlock
    this.renderer = new DebugRenderer(BlockRegistry.instance)
    this.extrasRenderer = new ExtrasRenderer()

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
      <svg class="editorContainer">
        ${this.extrasRenderer.renderBackground()} ${this.renderer.render()}
      </svg>
    `
  }

  static styles = css`
    .editorContainer {
      height: 80vh;
      width: 80vw;
      border: 1px solid black;
    }
  `
}
