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
import { DebugMixedEditorConfig, type MixedEditorConfig } from "./util/MixedEditorConfig"
import { createRef, ref } from "lit/directives/ref.js"
import type { MixedContentEditorConfiguration } from "./schema/editor"
import { applyData } from "./schema/schemaParser"
import { PanZoomHelper } from "./panzoom/PanZoomHelper"
import { isSafari } from "./util/browserCheck"

import "@kutelabs/shared"
import "./drag/DragLayer"
import type { DragLayer } from "./drag/DragLayer"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  workspaceRef = createRef<SVGSVGElement>()
  drawerRef = createRef<SVGSVGElement>()
  dragWorkspaceRef = createRef<SVGSVGElement>()
  dragLayerRef = createRef<DragLayer>()

  blockRegistry: BlockRegistry
  connectorRegistry: ConnectorRegistry
  declare layouter: BaseLayouter
  declare blockRenderer: BaseBlockRenderer
  declare drawerRenderer: BaseDrawerRenderer
  declare extrasRenderer: ExtrasRenderer
  declare dragRenderer: BaseDragRenderer
  dragHelper: DragHelper | undefined
  panzoomHelper = new PanZoomHelper(this.workspaceRef, [this.dragWorkspaceRef], scale => {
    this.blockRenderer?.setWorkspaceScaleFactor?.(scale)
    if (isSafari) this.requestUpdate() // rerender to apply foreign object scaling to work around [safari bug 23113](https://bugs.webkit.org/show_bug.cgi?id=23113)
  })

  declare useDefaultConfig: boolean
  declare config: MixedEditorConfig
  declare data: MixedContentEditorConfiguration
  static properties = {
    useDefaultConfig: { type: Boolean },
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
      height: 100%;
      width: 100%;
      background-color: white;
      border: 1px solid black;
      user-select: none;
      cursor: default;
    }
    .block {
      cursor: grab;
    }
  `

  protected render() {
    console.time("editor | render time")
    if (!this.isCorrectlyConfigured) return
    const result = html`
      <noscript>Please enable JavaScript.</noscript>
      <div
        id="editor-container"
        style="position: relative;"
        @mousedown="${(e: MouseEvent) => this.dragHelper!.startDrag(e)}"
        @touchstart="${(e: TouchEvent) => this.dragHelper!.startDrag(e)}"
        @mousemove="${(e: MouseEvent) => this.dragHelper!.drag(e)}"
        @mouseup="${(e: MouseEvent) => this.dragHelper!.endDrag(e)}"
        @mouseleave="${(e: MouseEvent) => this.dragHelper!.endDrag(e)}">
        <div
          tabindex="0"
          class="panzoom"
          @wheel="${(e: WheelEvent) => this.panzoomHelper.onWheel(e)}"
          @mousedown="${(e: MouseEvent) => this.panzoomHelper.onMouseDown(e)}"
          @touchstart="${(e: TouchEvent) => this.panzoomHelper.onTouchStart(e)}"
          @mousemove="${(e: MouseEvent) => this.panzoomHelper.onMouseMove(e)}"
          @touchmove="${(e: TouchEvent) => this.panzoomHelper.onTouchMove(e)}"
          @mouseup="${() => this.panzoomHelper.onMouseUpOrLeave()}"
          @mouseleave="${() => this.panzoomHelper.onMouseUpOrLeave()}"
          @touchend="${(e: TouchEvent) => this.panzoomHelper.onTouchEnd(e)}"
          @touchcancel="${(e: TouchEvent) => this.panzoomHelper.onTouchEnd(e)}">
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
          ${ref(this.drawerRef)}
          id="drawer-container"
          style="position: absolute; top: 0; left:0; bottom: 0; overflow: auto;">
          ${this.drawerRenderer!.renderElement()}
        </div>

        <editor-mixed-drag
          ${ref(this.dragLayerRef)}
          .dragRenderer=${this.dragRenderer}
          .dragLayerRef=${this.dragWorkspaceRef}></editor-mixed-drag>
      </div>
    `
    console.timeEnd("editor | render time")
    return result
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

    if (changedProperties.has("useDefaultConfig") && this.useDefaultConfig) {
      this.setConfig(DebugMixedEditorConfig)
    } else if (changedProperties.has("config") && this.config && this.config.layouter != null) {
      try {
        this.setConfig(this.config)
      } catch (e) {
        console.error("Invalid editor config", this.config)
        console.error(e)
      }
    }

    if (changedProperties.has("data") || changedProperties.has("config")) {
      this.requestUpdate()
    }
  }

  private setConfig(config: MixedEditorConfig) {
    console.log("setConfig", config)
    this.layouter = new config.layouter(this.blockRegistry)
    this.blockRenderer = new config.blockRenderer(this.blockRegistry, this.layouter)
    this.drawerRenderer = new config.drawerRenderer(
      this.blockRegistry,
      this.layouter,
      this.blockRenderer
    )
    this.dragRenderer = new config.dragRenderer(this.blockRegistry, this.blockRenderer)
    this.extrasRenderer = new config.extrasRenderer()
    this.dragHelper = new DragHelper(
      this.blockRegistry,
      this.connectorRegistry,
      this.dragRenderer,
      this.workspaceRef,
      this.drawerRef,
      () => this.dragLayerRef.value?.requestUpdate(),
      this.requestUpdate.bind(this)
    )
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
