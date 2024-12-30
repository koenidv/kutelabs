import { html } from "lit"
import { customElement } from "lit/decorators.js"
import { BaseDragRenderer } from "../render/DragRenderers/BaseDragRenderer"
import { ref, type Ref } from "lit/directives/ref.js"
import { PerformanceLitElement } from "../util/PerformanceLitElement"

@customElement("editor-mixed-drag")
export class DragLayer extends PerformanceLitElement {
  declare dragRenderer: BaseDragRenderer
  declare dragLayerRef: Ref<SVGSVGElement>
  static properties = {
    dragRenderer: { type: BaseDragRenderer },
    dragLayerRef: { type: Object },
  }

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this
  }

  protected renderContent() {
    return html`
      <svg
        ${ref(this.dragLayerRef)}
        id="drag-layer"
        width="100%"
        height="100%"
        viewBox="0 0 800 800"
        style="position: absolute; top: 0; left: 0; shape-rendering: crispEdges;"
        pointer-events="none">
        ${this.dragRenderer!.render()}
      </svg>
    `
  }
}
