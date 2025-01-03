import { css, html, LitElement, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import { createRef, ref } from "lit/directives/ref.js"
import type { BaseCompiler, CompilationResult } from "./compile/BaseCompiler"
import { DragHelper } from "./drag/DragHelper"
import type { DragLayer } from "./drag/DragLayer"
import { PanZoomHelper } from "./panzoom/PanZoomHelper"
import { BlockRegistry } from "./registries/BlockRegistry"
import { ConnectorRegistry } from "./registries/ConnectorRegistry"
import type { BaseBlockRenderer } from "./render/BlockRenderers/BaseBlockRenderer"
import type { BaseDragRenderer } from "./render/DragRenderers/BaseDragRenderer"
import type { BaseDrawerRenderer } from "./render/DrawerRenderers/BaseDrawerRenderer"
import { ExtrasRenderer } from "./render/ExtrasRenderers.ts/DefaultExtrasRenderer"
import type { BaseLayouter } from "./render/Layouters/BaseLayouter"
import type { BaseWidgetRenderer } from "./render/WidgetRenderers/BaseWidgetRenderer"
import type { MixedContentEditorConfiguration } from "./schema/editor"
import { applyData } from "./schema/schemaParser"
import { isSafari } from "./util/browserCheck"
import { DebugMixedEditorConfig, type MixedEditorConfig } from "./util/MixedEditorConfig"
import { VariableHelper } from "./variables/VariableHelper"
import type { VariableHInterface } from "./variables/VariableHInterface"

import "@kutelabs/shared"
import "./drag/DragLayer"
import { generateCallbacks } from "./environment/Environment"
import type { SandboxCallbacks } from "@kutelabs/client-runner/src"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  //#region Properties
  workspaceRef = createRef<SVGSVGElement>()
  drawerRef = createRef<SVGSVGElement>()
  dragWorkspaceRef = createRef<SVGSVGElement>()
  dragLayerRef = createRef<DragLayer>()

  blockRegistry: BlockRegistry
  connectorRegistry: ConnectorRegistry
  variableHelper: VariableHInterface
  declare layouter: BaseLayouter
  declare blockRenderer: BaseBlockRenderer
  declare drawerRenderer: BaseDrawerRenderer
  declare widgetRenderer: BaseWidgetRenderer
  declare extrasRenderer: ExtrasRenderer
  declare dragRenderer: BaseDragRenderer
  dragHelper: DragHelper | undefined
  panzoomHelper = new PanZoomHelper(
    this.workspaceRef,
    [this.dragWorkspaceRef],
    scale => {
      this.blockRenderer?.setWorkspaceScaleFactor?.(scale)
      if (isSafari) this.requestUpdate() // rerender to apply foreign object scaling to work around [safari bug 23113](https://bugs.webkit.org/show_bug.cgi?id=23113)
    },
    undefined,
    () => this.widgetRenderer?.removeWidget?.()
  )

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
    widgetRenderer: { type: Object, state: true },
  }

  constructor() {
    super()

    this.connectorRegistry = new ConnectorRegistry()
    this.blockRegistry = new BlockRegistry(this.connectorRegistry, this.requestUpdate.bind(this))

    this.variableHelper = new VariableHelper(
      this.blockRegistry,
      this.connectorRegistry,
      this.requestUpdate.bind(this)
    )
  }

  //#region Rendering

  static styles = css`
    #editor-container {
      height: 100%;
      width: 100%;
      background-color: white;
      user-select: none;
      cursor: default;
      overflow: hidden;
    }
    .block {
      cursor: grab;
    }
    button {
      cursor: pointer;
    }
  `

  protected render() {
    // console.time("editor | render time")
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

        <div id="editor-widgets" style="position: relative">${this.widgetRenderer.render()}</div>

        <editor-mixed-drag
          ${ref(this.dragLayerRef)}
          .dragRenderer=${this.dragRenderer}
          .dragLayerRef=${this.dragWorkspaceRef}></editor-mixed-drag>
      </div>
    `
    // console.timeEnd("editor | render time")
    return result
  }

  //#region State changes

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
    this.layouter = new config.layouter(this.blockRegistry)
    this.widgetRenderer = new config.widgetRenderer(
      this.workspaceRef,
      this.requestUpdate.bind(this)
    )
    this.blockRenderer = new config.blockRenderer(
      this.blockRegistry,
      this.layouter,
      this.widgetRenderer.setWidget.bind(this.widgetRenderer)
    )
    this.drawerRenderer = new config.drawerRenderer(
      this.blockRegistry,
      this.layouter,
      this.blockRenderer,
      this.data?.hideDrawer != true
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
      this.requestUpdate.bind(this),
      () => this.widgetRenderer?.removeWidget?.()
    )
  }

  private handleDataChanged(newData: MixedContentEditorConfiguration) {
    this.blockRegistry.clear()
    this.connectorRegistry.clear()
    applyData(newData, this.blockRegistry, this.connectorRegistry)
    if (this.drawerRenderer) this.drawerRenderer.enabled = newData.hideDrawer != true
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)
  }

  //#region Public API

  public compile<T>(
    compilerClass: {
      new (): T extends BaseCompiler ? T : null
    },
    callbacks: SandboxCallbacks
  ): CompilationResult {
    if (compilerClass == null) throw new Error("Compiler class is null")
    if (!this.blockRegistry.root) throw new Error("Root block is not initialized")

    const instance = new compilerClass()
    if (instance == null) throw new Error("Compiler instance is null")

    return instance.compileFromRoot(
      this.blockRegistry.root,
      this.data?.mainFunction ?? "main",
      callbacks,
      this.data?.invisibleCode ?? {}
    )
  }

  public getExecutionCallbacks(): { [name: string]: (...args: any) => any } {
    return generateCallbacks(this)
  }

  public onExecutionFinished() {
    this.blockRegistry.clearMarked(true)
  }

  public clearMarkings() {
    this.blockRegistry.clearMarked(false)
  }
}
