import { css, html, LitElement, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import type { BaseBlockRenderer } from "./render/BlockRenderers/BaseBlockRenderer"
import { DebugBlockRenderer } from "./render/BlockRenderers/DebugBlockRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { Block } from "./blocks/Block"
import { BlockType } from "./blocks/BlockType"
import { Coordinates } from "./util/Coordinates"
import { ExtrasRenderer } from "./render/ExtrasRenderers.ts/ExtrasRenderer"
import { DragHelper } from "./drag/DragHelper"
import { DebugDragRenderer } from "./render/DragRenderers/DebugDragRenderer"
import type { BaseDragRenderer } from "./render/DragRenderers/BaseDragRenderer"
import { DefinedExpression } from "./blocks/DefinedExpression"
import { DefaultConnectors } from "./connections/DefaultConnectors"
import type { BaseCompiler } from "./compile/BaseCompiler"
import type { BaseDrawerRenderer } from "./render/DrawerRenderers/BaseDrawerRenderer"
import { DebugDrawerRenderer } from "./render/DrawerRenderers/DebugDrawerRenderer"
import type { BaseLayouter } from "./render/Layouters/BaseLayouter"
import { DebugLayouter } from "./render/Layouters/DebugLayouter"
import { ConnectorRegistry } from "./registries/ConnectorRegistry"

import "@kutelabs/shared/src/extensions"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  blockRegistry: BlockRegistry
  connectorRegistry: ConnectorRegistry
  layouter: BaseLayouter
  renderer: BaseBlockRenderer
  drawerRenderer: BaseDrawerRenderer
  extrasRenderer: ExtrasRenderer
  dragRenderer: BaseDragRenderer
  dragHelper: DragHelper

  constructor() {
    super()
    this.connectorRegistry = new ConnectorRegistry()
    this.blockRegistry = new BlockRegistry(this.connectorRegistry)

    this.layouter = new DebugLayouter(this.blockRegistry)
    this.renderer = new DebugBlockRenderer(this.blockRegistry, this.layouter)
    this.drawerRenderer = new DebugDrawerRenderer(
      this.blockRegistry,
      this.layouter,
      this.renderer
    )
    this.extrasRenderer = new ExtrasRenderer()
    this.dragRenderer = new DebugDragRenderer(this.blockRegistry, this.renderer)
    this.dragHelper = new DragHelper(
      this.blockRegistry,
      this.connectorRegistry,
      this.dragRenderer,
      this.requestUpdate.bind(this)
    )

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
          customExpression: 'val test = "Hello, World!"',
          editable: true,
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

  protected render() {
    return html`
      <div
        id="editor-container"
        style="position: relative"
        @mousedown="${(e: MouseEvent) => this.dragHelper.startDrag(e)}"
        @mousemove="${(e: MouseEvent) => this.dragHelper.drag(e)}"
        @mouseup="${(e: MouseEvent) => this.dragHelper.endDrag(e)}"
        @mouseleave="${(e: MouseEvent) => this.dragHelper.endDrag(e)}">
        <svg
          width="100%"
          height="100%"
          style="position: absolute; top: 0; left: 0;">
          ${this.extrasRenderer.renderBackground()} ${this.renderer.render()}
        </svg>

        <div
          id="drawer-container"
          style="position: absolute; top: 0; left:0; bottom: 0; overflow: scroll;">
          ${this.drawerRenderer.renderElement()}
        </div>

        <svg
          id="drag-layer"
          width="100%"
          height="100%"
          style="position: absolute; top: 0; left: 0; shape-rendering: crispEdges;"
          pointer-events="none">
          ${this.dragRenderer.render()}
        </svg>
      </div>
    `
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties)
    this.dragHelper.observed = this.shadowRoot!.querySelector("svg")
  }

  static styles = css`
    #editor-container {
      height: 80vh;
      width: 80vw;
      border: 1px solid black;
      user-select: none;
    }
  `
}
