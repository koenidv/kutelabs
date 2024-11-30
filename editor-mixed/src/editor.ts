import { css, html, LitElement, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import type { BaseBlockRenderer } from "./render/BlockRenderers/BaseBlockRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { ExtrasRenderer } from "./render/ExtrasRenderers.ts/DefaultExtrasRenderer"
import { DragHelper } from "./drag/DragHelper"
import type { BaseDragRenderer } from "./render/DragRenderers/BaseDragRenderer"
import type { BaseCompiler } from "./compile/BaseCompiler"
import type { BaseDrawerRenderer } from "./render/DrawerRenderers/BaseDrawerRenderer"
import type { BaseLayouter } from "./render/Layouters/BaseLayouter"
import { ConnectorRegistry } from "./registries/ConnectorRegistry"
import type { MixedEditorConfig } from "./util/MixedEditorConfig"
import { createRef, ref } from "lit/directives/ref.js"

import "@kutelabs/shared"
import type { MixedContentEditorConfiguration } from "./schema/editor"
import { applyData } from "./schema/schemaParser"
import { PanZoomHelper } from "./panzoom/PanZoomHelper"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  workspaceRef = createRef<SVGSVGElement>()

  blockRegistry: BlockRegistry
  connectorRegistry: ConnectorRegistry
  declare layouter: BaseLayouter
  declare blockRenderer: BaseBlockRenderer
  declare drawerRenderer: BaseDrawerRenderer
  declare extrasRenderer: ExtrasRenderer
  declare dragRenderer: BaseDragRenderer
  dragHelper: DragHelper | undefined
  panzoomHelper = new PanZoomHelper(this.workspaceRef, this.requestUpdate.bind(this))

  declare config: MixedEditorConfig
  declare data: MixedContentEditorConfiguration
  static properties = {
    config: { type: Object },
    data: { type: Object },
    layouter: { type: Object, state: true },
    blockRenderer: { type: Object, state: true },
    drawerRenderer: { type: Object, state: true },
    extrasRenderer: { type: Object, state: true },
    dragRenderer: { type: Object, state: true },
  }

  constructor() {
    super()
    this.connectorRegistry = new ConnectorRegistry()
    this.blockRegistry = new BlockRegistry(this.connectorRegistry)
  }

  static styles = css`
    #editor-container {
      height: 80vh;
      width: 80vw;
      border: 1px solid black;
      user-select: none;
    }
  `

  protected render() {
    console.log("rendering")
    if (!this.isCorrectlyConfigured) return
    return html`
      <div
        id="editor-container"
        style="position: relative"
        @mousedown="${(e: MouseEvent) => this.dragHelper!.startDrag(e)}"
        @mousemove="${(e: MouseEvent) => this.dragHelper!.drag(e)}"
        @mouseup="${(e: MouseEvent) => this.dragHelper!.endDrag(e)}"
        @mouseleave="${(e: MouseEvent) => this.dragHelper!.endDrag(e)}">
        <div class="panzoom" @wheel="${(e: WheelEvent) => this.panzoomHelper.onWheel(e)}">
          <svg
            ${ref(this.workspaceRef)}
            width="100%"
            height="100%"
            viewBox="0 0 800 800"
            style="position: absolute; top: 0; left: 0; pointer-events: all;">
            ${this.extrasRenderer.renderBackground()} ${this.blockRenderer.render()}
          </svg>
        </div>

        <div
          id="drawer-container"
          style="position: absolute; top: 0; left:0; bottom: 0; overflow: scroll;">
          ${this.drawerRenderer!.renderElement()}
        </div>

        <svg
          id="drag-layer"
          width="100%"
          height="100%"
          style="position: absolute; top: 0; left: 0; shape-rendering: crispEdges;"
          pointer-events="none">
          ${this.dragRenderer!.render()}
        </svg>
      </div>
    `
  }

  private get isCorrectlyConfigured(): boolean {
    return (
      this.layouter != undefined &&
      this.blockRenderer != undefined &&
      this.drawerRenderer != undefined &&
      this.extrasRenderer != undefined &&
      this.dragRenderer != undefined &&
      this.dragHelper != undefined &&
      this.panzoomHelper != undefined
    )
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("data")) {
      this.handleDataChanged(this.data)
    }

    if (changedProperties.has("config") && this.config && this.config.layouter != null) {
      try {
        this.layouter = new this.config.layouter(this.blockRegistry)
        this.blockRenderer = new this.config.blockRenderer(this.blockRegistry, this.layouter)
        this.drawerRenderer = new this.config.drawerRenderer(
          this.blockRegistry,
          this.layouter,
          this.blockRenderer
        )
        this.dragRenderer = new this.config.dragRenderer(this.blockRegistry, this.blockRenderer)
        this.extrasRenderer = new this.config.extrasRenderer()
        this.dragHelper = new DragHelper(
          this.blockRegistry,
          this.connectorRegistry,
          this.dragRenderer,
          this.workspaceRef,
          this.requestUpdate.bind(this)
        )
      } catch (e) {
        console.error("Invalid editor config", this.config)
        console.error(e)
      }
    }

    if (changedProperties.has("data") || changedProperties.has("config")) {
      this.requestUpdate()
    }
  }

  private handleDataChanged(newData: MixedContentEditorConfiguration) {
    this.blockRegistry.clear()
    this.connectorRegistry.clear()
    applyData(newData, this.blockRegistry, this.connectorRegistry)
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)
  }

  public compile<T>(compilerClass: { new (): T extends BaseCompiler ? T : null }): string {
    if (compilerClass == null) throw new Error("Compiler class is null")
    if (!this.blockRegistry.root) throw new Error("Root block is not initialized")

    const instance = new compilerClass()
    if (instance == null) throw new Error("Compiler instance is null")

    return instance.compileFromRoot(this.blockRegistry.root, true)
  }
}
