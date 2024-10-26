import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import { BlockRegistry } from "../registries/BlockRegistry"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import type { RegisteredBlock } from "../registries/RegisteredBlock"
import type { DragRenderer } from "../render/DragRenderer"
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
  private x = 0
  private y = 0

  startDrag(evt: MouseEvent) {
    const draggedParent = this.findDragableParent(evt.target as HTMLElement)
    if (draggedParent == null) return
    this.dragged = this.getDraggedData(draggedParent)
    if (this.dragged == null) return
    evt.preventDefault()

    this.x =
      draggedParent.getBoundingClientRect().left -
      this._observed!.getBoundingClientRect().left
    this.y =
      draggedParent.getBoundingClientRect().top -
      this._observed!.getBoundingClientRect().top

    this.dragged.block.disconnectSelf()
    BlockRegistry.instance.setDetached(this.dragged.block)

    this.renderer.update(this.dragged, this.x, this.y)
    this.requestRerender()

    // todo call drag renderer to draw dragged block
    // todo request rerender
  }

  drag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    const ctm = this._observed!.getScreenCTM()!
    this.x += evt.movementX / ctm.a
    this.y += evt.movementY / ctm.d

    this.renderer.update(this.dragged, this.x, this.y)
    this.requestRerender()

    // const closestConnector = ConnectorRegistry.instance.selectConnectorForBlock(
    //   this.dragged,
    //   { x: this.x, y: this.y },
    //   25
    // )
    // this.updateDropIndicator(closestConnector?.to ?? null)
    // this.updateElementBobbing(closestConnector?.to ?? null)

    // this.move(this.copiedElement, this.x, this.y)

    // todo update position and drop targt in drag renderer (request rerender?)
  }

  endDrag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    this.insertOnSnap(this.dragged, null)

    this.dragged = null
    BlockRegistry.instance.setDetached(null)
    this.renderer.remove()

    this.requestRerender()

    // todo remove dragged element from drag renderer
    // todo request rerender

    // this.removeClonedElement()
    // this.hideDropIndicator()
    // this.stopElementBobbing()

    // const snapToConnector = ConnectorRegistry.instance.selectConnectorForBlock(
    //   this.dragged,
    //   { x: this.x, y: this.y },
    //   25
    // )
    // this.insertDraggedDataAndFree(snapToConnector)
  }

  insertOnSnap(dragged: RegisteredBlock, snap: Connection | null) {
    const connectOnBlock = snap?.to.parentBlock ?? BlockRegistry.instance.root!
    const snapOnConnection =
      snap ??
      new Connection(Connector.Root, dragged.block.connectors.internal)

    connectOnBlock.connect(
      dragged.block,
      snapOnConnection,
      new Coordinates(this.x, this.y)
    )
    
  }

  private getDraggedData(
    draggableParent: HTMLElement | null
  ): RegisteredBlock | null {
    if (draggableParent == null) return null
    const blockId = draggableParent.id.replace("block-", "")
    return BlockRegistry.instance.getRegisteredById(blockId) ?? null
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
}
