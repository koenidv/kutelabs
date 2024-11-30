import type { Ref } from "lit/directives/ref.js"
import { Connection } from "../connections/Connection"
import { BlockRegistry } from "../registries/BlockRegistry"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import type { AnyRegisteredBlock } from "../registries/RegisteredBlock"
import type { BaseDragRenderer } from "../render/DragRenderers/BaseDragRenderer"
import { Coordinates } from "../util/Coordinates"

export class DragHelper {
  private readonly blockRegistry: BlockRegistry
  private readonly connectorRegistry: ConnectorRegistry
  private readonly renderer: BaseDragRenderer
  private readonly workspaceRef: Ref<SVGSVGElement>
  private readonly requestRerender: () => void

  constructor(
    blockRegistry: BlockRegistry,
    connectorRegistry: ConnectorRegistry,
    renderer: BaseDragRenderer,
    workspaceRef: Ref<SVGSVGElement>,
    rerender: () => void
  ) {
    this.blockRegistry = blockRegistry
    this.connectorRegistry = connectorRegistry
    this.renderer = renderer
    this.workspaceRef = workspaceRef
    this.requestRerender = rerender
  }
  private dragged: AnyRegisteredBlock | null = null
  private startPos = Coordinates.zero
  private dragX = 0
  private dragY = 0

  //#region Start Drag

  startDrag(evt: MouseEvent) {
    if (!this.workspaceRef.value) throw new Error("Workspace not initialized")

    const draggedParent = this.findParent(
      evt.target as HTMLElement,
      it => it.classList.contains("dragable"),
      it => it.classList.contains("donotdrag")
    )
    if (draggedParent == null) return
    this.dragged = this.getDraggedData(draggedParent)
    if (this.dragged == null) return
    evt.preventDefault()

    this.startPos = this.blockRegistry.getPosition(this.dragged.block)

    this.dragged.block.disconnectSelf()
    this.blockRegistry.setDetached(this.dragged.block)

    this.renderer.update(this.dragged, this.startPos, null)
    this.requestRerender()
  }

  private getDraggedData(
    draggableParent: HTMLElement | null
  ): AnyRegisteredBlock | null {
    if (draggableParent == null) return null
    const blockId = draggableParent.id.replace("block-", "")
    return this.blockRegistry.getRegisteredById(blockId) ?? null
  }

  //#region Update Drag

  drag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    const ctm = this.workspaceRef.value!.getScreenCTM()!
    this.dragX += evt.movementX / ctm.a
    this.dragY += evt.movementY / ctm.d

    const snap = this.connectorRegistry.selectConnectorForBlock(
      this.dragged.block,
      new Coordinates(this.dragX, this.dragY),
      25
    )

    this.renderer.update(
      this.dragged,
      Coordinates.add(this.startPos, new Coordinates(this.dragX, this.dragY)),
      snap
    )

    this.requestRerender()
  }

  //#region Finalize Drag

  endDrag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    if (
      this.findParent(evt.target as HTMLElement, it => it.id == "drawer") !=
      null
    ) {
      // Dropped on drawer
      this.blockRegistry.attachToDrawer(this.dragged.block)
    } else {
      // Snapped to another connector on dropped in the workspace
      const snap = this.connectorRegistry.selectConnectorForBlock(
        this.dragged.block,
        new Coordinates(this.dragX, this.dragY),
        25
      )
      this.insertOnSnap(this.dragged, snap)
    }

    this.reset()

    this.requestRerender()
  }

  private insertOnSnap(dragged: AnyRegisteredBlock, snap: Connection | null) {
    const connectOnBlock = snap?.to.parentBlock ?? this.blockRegistry.root!
    const snapOnConnection =
      snap ??
      new Connection(
        this.blockRegistry.root!.rootConnector,
        dragged.block.connectors.internal
      )

    connectOnBlock.connect(
      dragged.block,
      snapOnConnection,
      Coordinates.add(this.startPos, new Coordinates(this.dragX, this.dragY))
    )
  }

  private reset() {
    this.dragged = null
    this.blockRegistry.setDetached(null)
    this.renderer.remove()
    this.startPos = Coordinates.zero
    this.dragX = 0
    this.dragY = 0
  }

  private findParent(
    element: HTMLElement | null,
    predicate: (it: HTMLElement) => boolean,
    breakCondition?: (it: HTMLElement) => boolean
  ): HTMLElement | null {
    if (!element) return null
    if (breakCondition?.(element)) return null
    if (predicate(element)) return element

    // this will stop at the shadow root
    if (element.parentElement)
      return this.findParent(element.parentElement, predicate, breakCondition)
    return null
  }
}
