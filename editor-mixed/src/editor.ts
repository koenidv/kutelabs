import { css, html, LitElement, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import type { BaseBlockRenderer } from "./render/BlockRenderers/BaseBlockRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { Block } from "./blocks/Block"
import { BlockType } from "./blocks/configuration/BlockType"
import { Coordinates } from "./util/Coordinates"
import { ExtrasRenderer } from "./render/ExtrasRenderers.ts/DefaultExtrasRenderer"
import { DragHelper } from "./drag/DragHelper"
import type { BaseDragRenderer } from "./render/DragRenderers/BaseDragRenderer"
import { DefinedExpression } from "./blocks/DefinedExpression"
import { DefaultConnectors } from "./connections/DefaultConnectors"
import type { BaseCompiler } from "./compile/BaseCompiler"
import type { BaseDrawerRenderer } from "./render/DrawerRenderers/BaseDrawerRenderer"
import type { BaseLayouter } from "./render/Layouters/BaseLayouter"
import { ConnectorRegistry } from "./registries/ConnectorRegistry"
import type { MixedEditorConfig } from "./util/MixedEditorConfig"

import "@kutelabs/shared"
import { createRef, ref } from "lit/directives/ref.js"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  blockRegistry: BlockRegistry
  connectorRegistry: ConnectorRegistry
  declare layouter: BaseLayouter
  declare blockRenderer: BaseBlockRenderer
  declare drawerRenderer: BaseDrawerRenderer
  declare extrasRenderer: ExtrasRenderer
  declare dragRenderer: BaseDragRenderer
  dragHelper: DragHelper | undefined

  workspaceRef = createRef<SVGSVGElement>()

  declare config: MixedEditorConfig
  static properties = {
    config: { type: Object },
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
    this.addDebugBlocks()
  }

  private addDebugBlocks() {
    const mainFn = new Block(
      null,
      BlockType.Function,
      { name: "main" },
      [DefaultConnectors.innerLoop()],
      true,
      this.blockRegistry,
      this.connectorRegistry
    )
    this.blockRegistry.attachToRoot(mainFn, () => new Coordinates(200, 200))
    const block1 = new Block(
      mainFn,
      BlockType.Expression,
      { expression: DefinedExpression.Println },
      [
        DefaultConnectors.before(),
        DefaultConnectors.after(),
        DefaultConnectors.inputExtension(),
      ],
      true,
      this.blockRegistry,
      this.connectorRegistry
    )
    new Block(
      block1,
      BlockType.Loop,
      null,
      [
        DefaultConnectors.before(),
        DefaultConnectors.after(),
        DefaultConnectors.inputExtension(),
        DefaultConnectors.innerLoop(),
      ],
      true,
      this.blockRegistry,
      this.connectorRegistry
    )
    this.blockRegistry.attachToRoot(
      new Block(
        null,
        BlockType.Expression,
        {
          expression: DefinedExpression.Custom,
          customExpression: new Map()
            .set("js", 'let test = "Hello, World!"')
            .set("kt", 'val test = "Hello, World!"'),
          editable: {
            lang: "kt",
            linesHeight: 4,
          },
        },
        [DefaultConnectors.before(), DefaultConnectors.after()],
        true,
        this.blockRegistry,
        this.connectorRegistry
      ),
      () => new Coordinates(450, 100)
    )
    this.blockRegistry.attachToRoot(
      new Block(
        null,
        BlockType.Value,
        { input: "Hello" },
        [DefaultConnectors.extender()],
        true,
        this.blockRegistry,
        this.connectorRegistry
      ),
      () => new Coordinates(375, 300)
    )
    this.blockRegistry.attachToRoot(
      new Block(
        null,
        BlockType.Value,
        { input: "World" },
        [DefaultConnectors.extender()],
        true,
        this.blockRegistry,
        this.connectorRegistry
      ),
      () => new Coordinates(374, 400)
    )
    this.blockRegistry.attachToDrawer(
      new Block(
        null,
        BlockType.Expression,
        { expression: DefinedExpression.Println },
        [
          DefaultConnectors.before(),
          DefaultConnectors.after(),
          DefaultConnectors.inputExtension(),
        ],
        true,
        this.blockRegistry,
        this.connectorRegistry
      )
    )
    this.blockRegistry.attachToDrawer(
      new Block(
        null,
        BlockType.Value,
        { input: "Hello" },
        [DefaultConnectors.extender()],
        true,
        this.blockRegistry,
        this.connectorRegistry
      )
    )
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
    if (!this.isCorrectlyConfigured) {
      console.log("not correctly configured")
      return
    }
    return html`
      <div
        id="editor-container"
        style="position: relative"
        @mousedown="${(e: MouseEvent) => this.dragHelper!.startDrag(e)}"
        @mousemove="${(e: MouseEvent) => this.dragHelper!.drag(e)}"
        @mouseup="${(e: MouseEvent) => this.dragHelper!.endDrag(e)}"
        @mouseleave="${(e: MouseEvent) => this.dragHelper!.endDrag(e)}">
        <svg
          ${ref(this.workspaceRef)}
          width="100%"
          height="100%"
          style="position: absolute; top: 0; left: 0;">
          ${this.extrasRenderer.renderBackground()}
          ${this.blockRenderer.render()}
        </svg>

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
      this.dragHelper != undefined
    )
  }

  protected updated(changedProperties: PropertyValues): void {
    if (
      changedProperties.has("config") &&
      this.config &&
      this.config.layouter != null
    ) {
      try {
        console.log("updating editor config", this.config)
        this.layouter = new this.config.layouter(this.blockRegistry)
        this.blockRenderer = new this.config.blockRenderer(
          this.blockRegistry,
          this.layouter
        )
        this.drawerRenderer = new this.config.drawerRenderer(
          this.blockRegistry,
          this.layouter,
          this.blockRenderer
        )
        this.dragRenderer = new this.config.dragRenderer(
          this.blockRegistry,
          this.blockRenderer
        )
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
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)
  }

  public compile<T>(compilerClass: {
    new (): T extends BaseCompiler ? T : null
  }): string {
    if (compilerClass == null) throw new Error("Compiler class is null")
    if (!this.blockRegistry.root)
      throw new Error("Root block is not initialized")

    const instance = new compilerClass()
    if (instance == null) throw new Error("Compiler instance is null")

    return instance.compileFromRoot(this.blockRegistry.root, true)
  }
}
