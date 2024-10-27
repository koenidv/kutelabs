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

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  renderer: BaseBlockRenderer
  extrasRenderer: ExtrasRenderer
  dragRenderer: BaseDragRenderer
  dragHelper: DragHelper

  constructor() {
    super()
    BlockRegistry.instance.initRoot()

    this.renderer = new DebugBlockRenderer(BlockRegistry.instance)
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
    BlockRegistry.instance.attachToRoot(new Block(
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
  () => new Coordinates(450, 200))
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
  }

  public toJs(): string {
    return "Not implemented"
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
