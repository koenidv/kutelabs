import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import { BlockRegistry } from "../registries/BlockRegistry"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import type { AnyRegisteredBlock } from "../registries/RegisteredBlock"
import type { BaseDragRenderer } from "../render/DragRenderers/BaseDragRenderer"
import { Coordinates } from "../util/Coordinates"

export class DragHelper {
  private renderer: BaseDragRenderer
  private requestRerender: () => void

  constructor(renderer: BaseDragRenderer, rerender: () => void) {
    this.renderer = renderer
    this.requestRerender = rerender
  }

  private _observed: SVGSVGElement | null = null
  public set observed(value: SVGSVGElement | null) {
    this._observed = value
  }

  private dragged: AnyRegisteredBlock | null = null
  private startPos = Coordinates.zero
  private dragX = 0
  private dragY = 0

  //#region Start Drag

  startDrag(evt: MouseEvent) {
    const draggedParent = this.findParent(evt.target as HTMLElement, it =>
      it.classList.contains("dragable")
    )
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

  private getDraggedData(
    draggableParent: HTMLElement | null
  ): AnyRegisteredBlock | null {
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

    if (
      this.findParent(evt.target as HTMLElement, it => it.id == "drawer") !=
      null
    ) {
      // Dropped on drawer
      BlockRegistry.instance.attachToDrawer(this.dragged.block)
    } else {
      // Snapped to another connector on dropped in the workspace
      const snap = ConnectorRegistry.instance.selectConnectorForBlock(
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
    const connectOnBlock = snap?.to.parentBlock ?? BlockRegistry.instance.root!
    const snapOnConnection =
      snap ??
      new Connection(DefaultConnectors.Root, dragged.block.connectors.internal)

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

  private findParent(
    element: HTMLElement | null,
    predicate: (it: HTMLElement) => boolean
  ): HTMLElement | null {
    if (!element) return null
    if (predicate(element)) return element

    // this will stop at the shadow root
    if (element.parentElement)
      return this.findParent(element.parentElement, predicate)
    return null
  }
}
