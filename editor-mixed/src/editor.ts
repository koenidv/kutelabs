import { css, html, LitElement, svg, type TemplateResult } from "lit"
import { customElement, property } from "lit/decorators.js"
import type { BaseRenderer } from "./render/AbstractRenderer"
import { DebugRenderer } from "./render/DebugRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { HMR_RootBlockSingleton, RootBlock } from "./blocks/RootBlock"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  
  rootBlock: RootBlock
  
  @property()
  renderer: BaseRenderer

  constructor() {
    super()
    this.rootBlock = HMR_RootBlockSingleton.instance
    BlockRegistry.instance.root = this.rootBlock
    this.renderer ??= new DebugRenderer(BlockRegistry.instance)
  }
  

  protected render() {
    return html`
      <svg class="editorContainer">
        ${this.renderGrid()}
        ${this.renderer.render()}
      </svg>
    `
  }

  private renderGrid(): TemplateResult<2> {
    return svg`
      <pattern
        id="pattern-circles"
        x="0"
        y="0"
        width="50"
        height="50"
        patternUnits="userSpaceOnUse"
        patternContentUnits="userSpaceOnUse">
        <circle id="pattern-circle" cx="10" cy="10" r="1.6257413380501518" fill="#00000032"></circle>
      </pattern>
	  	<rect id="rect" x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)"></rect>
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
