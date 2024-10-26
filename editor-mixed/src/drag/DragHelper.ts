import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import { BlockRegistry } from "../registries/BlockRegistry"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import type { RegisteredBlock } from "../registries/RegisteredBlock"
import type { DragRenderer } from "../render/DragRenderers/BaseDragRenderer"
import { Coordinates } from "../util/Coordinates"

export class DragHelper {
  private renderer: DragRenderer
  private requestRerender: () => void

  constructor(renderer: DragRenderer, rerender: () => void) {
    this.renderer = renderer
    this.requestRerender = rerender
  }

  private _observed: SVGSVGElement | null = null
  public set observed(value: SVGSVGElement | null) {
    this._observed = value
  }

  private dragged: RegisteredBlock | null = null
  private startPos = Coordinates.zero
  private dragX = 0
  private dragY = 0

  //#region Start Drag

  startDrag(evt: MouseEvent) {
    const draggedParent = this.findDragableParent(evt.target as HTMLElement)
    if (draggedParent == null) return
    this.dragged = this.getDraggedData(draggedParent)
    if (this.dragged == null) return
    evt.preventDefault()

    this.startPos = new Coordinates(
      draggedParent.getBoundingClientRect().left -
        this._observed!.getBoundingClientRect().left,
      draggedParent.getBoundingClientRect().top -
        this._observed!.getBoundingClientRect().top
    )

    this.dragged.block.disconnectSelf()
    BlockRegistry.instance.setDetached(this.dragged.block)

    this.renderer.update(this.dragged, this.startPos, null)
    this.requestRerender()
  }

  private findDragableParent(element: HTMLElement | null): HTMLElement | null {
    if (!element) return null
    if (element.classList.contains("dragable")) return element
    if (
      element.parentElement &&
      element.parentElement.className != "editorContainer"
    )
      return this.findDragableParent(element.parentElement)
    return null
  }

  private getDraggedData(
    draggableParent: HTMLElement | null
  ): RegisteredBlock | null {
    if (draggableParent == null) return null
    const blockId = draggableParent.id.replace("block-", "")
    return BlockRegistry.instance.getRegisteredById(blockId) ?? null
  }

  //#region Update Drag

  drag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    const ctm = this._observed!.getScreenCTM()!
    this.dragX += evt.movementX / ctm.a
    this.dragY += evt.movementY / ctm.d

    const snap = ConnectorRegistry.instance.selectConnectorForBlock(
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

    const snap = ConnectorRegistry.instance.selectConnectorForBlock(
      this.dragged.block,
      new Coordinates(this.dragX, this.dragY),
      25
    )
    this.insertOnSnap(this.dragged, snap)

    this.reset()

    this.requestRerender()
  }

  private insertOnSnap(dragged: RegisteredBlock, snap: Connection | null) {
    const connectOnBlock = snap?.to.parentBlock ?? BlockRegistry.instance.root!
    const snapOnConnection =
      snap ?? new Connection(Connector.Root, dragged.block.connectors.internal)

    connectOnBlock.connect(
      dragged.block,
      snapOnConnection,
      Coordinates.add(this.startPos, new Coordinates(this.dragX, this.dragY))
    )
  }

  private reset() {
    this.dragged = null
    BlockRegistry.instance.setDetached(null)
    this.renderer.remove()
    this.startPos = Coordinates.zero
    this.dragX = 0
    this.dragY = 0
  }
}
