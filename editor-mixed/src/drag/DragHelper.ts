import type { Ref } from "lit/directives/ref.js"
import { Connection } from "../connections/Connection"
import { BlockRegistry } from "../registries/BlockRegistry"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import type { AnyRegisteredBlock } from "../registries/RegisteredBlock"
import type { BaseDragRenderer } from "../render/DragRenderers/BaseDragRenderer"
import { Coordinates } from "../util/Coordinates"
import type { AnyBlock } from "../blocks/Block"

export class DragHelper {
  private readonly blockRegistry: BlockRegistry
  private readonly connectorRegistry: ConnectorRegistry
  private readonly renderer: BaseDragRenderer
  private readonly workspaceRef: Ref<SVGSVGElement>
  private readonly requestRerender: (full: boolean) => void

  constructor(
    blockRegistry: BlockRegistry,
    connectorRegistry: ConnectorRegistry,
    renderer: BaseDragRenderer,
    workspaceRef: Ref<SVGSVGElement>,
    rerenderDrag: () => void,
    rerenderWorkspace: () => void
  ) {
    this.blockRegistry = blockRegistry
    this.connectorRegistry = connectorRegistry
    this.renderer = renderer
    this.workspaceRef = workspaceRef
    this.requestRerender = (full: boolean) => {
      rerenderDrag()
      if (full) rerenderWorkspace()
    }
  }
  private dragged: AnyRegisteredBlock | null = null
  private startPos = Coordinates.zero
  private dragX = 0
  private dragY = 0
  private currentTouchX = 0
  private currentTouchY = 0

  //#region Start Drag

  startDrag(evt: MouseEvent | TouchEvent) {
    if (evt.defaultPrevented) return
    if (evt instanceof MouseEvent && evt.button != 0) return
    if (typeof TouchEvent != "undefined" && evt instanceof TouchEvent && evt.touches.length != 1)
      return
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

    this.startPos = this.determineBlockStartPosition(this.dragged, draggedParent)

    if (typeof TouchEvent != "undefined" && evt instanceof TouchEvent) this.handleTouchStart(evt)

    this.dragged.block.disconnectSelf()
    this.blockRegistry.setDetached(this.dragged.block)

    this.afterDrag(this.dragged, this.dragX, this.dragY, true)
    this.workspaceRef.value.style.cursor = "grabbing"
  }

  private getDraggedData(draggableParent: HTMLElement | null): AnyRegisteredBlock | null {
    if (draggableParent == null) return null
    const blockId = draggableParent.id.replace("block-", "")
    return this.blockRegistry.getRegisteredById(blockId) ?? null
  }

  private determineBlockStartPosition(
    block: AnyRegisteredBlock,
    target: HTMLElement
  ): Coordinates {
    if (!block.block.isInDrawer) return block.globalPosition

    // let drag vector point from actual workspace position drawer-space position
    // connector selection relies on this offset because connector positions are not recalculated during drag
    const ctm = this.workspaceRef.value!.getScreenCTM()!

    this.dragX = (target.getBoundingClientRect().x - ctm.e) / ctm.a - block.globalPosition.x
    this.dragY = (target.getBoundingClientRect().y - ctm.f) / ctm.d - block.globalPosition.y
    return block.globalPosition
  }

  private handleTouchStart(evt: TouchEvent) {
    this.currentTouchX = evt.touches[0].clientX
    this.currentTouchY = evt.touches[0].clientY
    // attaching touch events to the target as they would break on rerender
    // see https://stackoverflow.com/questions/33298828/touch-move-event-dont-fire-after-touch-start-target-is-removed
    const onTouchMove = this.touchDrag.bind(this) as EventListener
    const onTouchEnd = ((e: TouchEvent) => {
      evt.target?.removeEventListener("touchmove", onTouchMove)
      evt.target?.removeEventListener("touchend", onTouchEnd)
      evt.target?.removeEventListener("touchcancel", onTouchEnd)
      this.endDrag(e)
    }).bind(this) as EventListener
    evt.target!.addEventListener("touchmove", onTouchMove)
    evt.target!.addEventListener("touchend", onTouchEnd)
    evt.target!.addEventListener("touchcancel", onTouchEnd)
  }

  //#region Update Drag

  drag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    const ctm = this.workspaceRef.value!.getScreenCTM()!
    this.dragX += evt.movementX / ctm.a
    this.dragY += evt.movementY / ctm.d

    this.afterDrag(this.dragged, this.dragX, this.dragY)
  }

  touchDrag(evt: TouchEvent) {
    if (!this.dragged || evt.touches.length != 1) return
    evt.preventDefault()

    const ctm = this.workspaceRef.value!.getScreenCTM()!
    this.dragX += (evt.touches[0].clientX - this.currentTouchX) / ctm.a
    this.dragY += (evt.touches[0].clientY - this.currentTouchY) / ctm.d

    this.currentTouchX = evt.touches[0].clientX
    this.currentTouchY = evt.touches[0].clientY

    this.afterDrag(this.dragged, this.dragX, this.dragY, false)
  }

  private afterDrag(dragged: AnyRegisteredBlock, dragX: number, dragY: number, fullUpdate = false) {
    const snap = this.connectorRegistry.selectConnectorForBlock(
      dragged.block,
      new Coordinates(dragX, dragY),
      25
    )

    this.renderer.update(
      dragged,
      Coordinates.add(this.startPos, new Coordinates(dragX, dragY)),
      snap
    )

    this.requestRerender(fullUpdate)
  }

  //#region Finalize Drag

  endDrag(evt: MouseEvent | TouchEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    if (this.findParent(evt.target as HTMLElement, it => it.id == "drawer") != null) {
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
    this.workspaceRef.value!.style.cursor = "unset"
    this.requestRerender(true)
  }

  private insertOnSnap(dragged: AnyRegisteredBlock, snap: Connection | null) {
    const connectOnBlock = snap?.to.parentBlock ?? this.blockRegistry.root!
    const snapOnConnection =
      snap ??
      new Connection(this.blockRegistry.root!.rootConnector, dragged.block.connectors.internal)

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
    this.dragX = this.dragY = 0
    this.currentTouchX = this.currentTouchY = 0
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
