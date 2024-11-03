import { css, html, LitElement, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import type { BaseBlockRenderer } from "./render/BlockRenderers/BaseBlockRenderer"
import { DebugBlockRenderer } from "./render/BlockRenderers/DebugBlockRenderer"
import { BlockRegistry } from "./registries/BlockRegistry"
import { Block, type AnyBlock } from "./blocks/Block"
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

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  renderer: BaseBlockRenderer
  drawerRenderer: BaseDrawerRenderer
  extrasRenderer: ExtrasRenderer
  dragRenderer: BaseDragRenderer
  dragHelper: DragHelper

  constructor() {
    super()
    BlockRegistry.instance.init()

    this.renderer = new DebugBlockRenderer(BlockRegistry.instance)
    this.drawerRenderer = new DebugDrawerRenderer(
      (block: Block<BlockType>, position: Coordinates) =>
        this.renderer.renderBlock(block, null, position),
      this.renderer.measureBlock.bind(this.renderer),
      this.renderer.setConnectorPositions.bind(this.renderer)
    )
    this.extrasRenderer = new ExtrasRenderer()
    this.dragRenderer = new DebugDragRenderer(
      (block: Block<BlockType>, position: Coordinates) =>
        this.renderer.renderBlock(block, null, position)
    )
    this.dragHelper = new DragHelper(
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
      true
    )
    BlockRegistry.instance.attachToRoot(mainFn, () => new Coordinates(100, 200))
    const block1 = new Block(
      mainFn,
      BlockType.Expression,
      { expression: DefinedExpression.Println },
      [
        DefaultConnectors.before(),
        DefaultConnectors.after(),
        DefaultConnectors.inputExtension(),
      ],
      true
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
      true
    )
    BlockRegistry.instance.attachToRoot(
      new Block(
        null,
        BlockType.Loop,
        null,
        [
          DefaultConnectors.before(),
          DefaultConnectors.after(),
          DefaultConnectors.inputExtension(),
          DefaultConnectors.innerLoop(),
        ],
        true
      ),
      () => new Coordinates(450, 200)
    )
    BlockRegistry.instance.attachToRoot(
      new Block(
        null,
        BlockType.Value,
        { input: "Hello" },
        [DefaultConnectors.extender()],
        true
      ),
      () => new Coordinates(300, 250)
    )
    BlockRegistry.instance.attachToRoot(
      new Block(
        null,
        BlockType.Value,
        { input: "World" },
        [DefaultConnectors.extender()],
        true
      ),
      () => new Coordinates(300, 400)
    )
    BlockRegistry.instance.attachToDrawer(
      new Block(
        null,
        BlockType.Expression,
        { expression: DefinedExpression.Println },
        [
          DefaultConnectors.before(),
          DefaultConnectors.after(),
          DefaultConnectors.inputExtension(),
        ],
        true
      )
    )
    BlockRegistry.instance.attachToDrawer(
      new Block(
        null,
        BlockType.Value,
        { input: "Hello" },
        [DefaultConnectors.extender()],
        true
      )
    )
  }

  public compile(compiler: BaseCompiler): string {
    if (!BlockRegistry.instance.root)
      throw new Error("Root block is not initialized")
    return compiler.compileFromRoot(BlockRegistry.instance.root, true)
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
    }
  `
}
