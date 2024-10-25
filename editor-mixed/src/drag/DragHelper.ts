import { Connection } from "../connections/Connection"
import { Connector } from "../connections/Connector"
import { BlockRegistry } from "../registries/BlockRegistry"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import type { RegisteredBlock } from "../registries/RegisteredBlock"
import { Coordinates } from "../util/Coordinates"

export class DragHelper {
  constructor() {}

  private _observed: SVGSVGElement | null = null
  public set observed(value: SVGSVGElement | null) {
    this._observed = value
  }

  private dragged: RegisteredBlock | null = null
  private x = 0
  private y = 0

  startDrag(evt: MouseEvent) {
    this.dragged = this.getDraggedData(evt.target as HTMLElement)
    if (this.dragged == null) return
    evt.preventDefault()

    this.dragged.block.disconnectSelf()

    // todo call drag renderer to draw dragged block
    // todo request rerender
  }

  drag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    const ctm = this._observed!.getScreenCTM()!
    this.x += evt.movementX / ctm.a
    this.y += evt.movementY / ctm.d

    const closestConnector = ConnectorRegistry.instance.selectConnectorForBlock(
      this.dragged,
      { x: this.x, y: this.y },
      25
    )
    // this.updateDropIndicator(closestConnector?.to ?? null)
    // this.updateElementBobbing(closestConnector?.to ?? null)

    // this.move(this.copiedElement, this.x, this.y)

    // todo update position and drop targt in drag renderer (request rerender?)
  }

  endDrag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    this.dragged = null

    // todo remove dragged element from drag renderer

    // this.removeClonedElement()
    // this.hideDropIndicator()
    // this.stopElementBobbing()

    const snapToConnector = ConnectorRegistry.instance.selectConnectorForBlock(
      this.dragged,
      { x: this.x, y: this.y },
      25
    )
    this.insertDraggedDataAndFree(snapToConnector)
  }

  insertDraggedDataAndFree(snap: Connection | null) {
    if (!this.dragged) return

    const connectOnBlock = snap?.to.parentBlock ?? BlockRegistry.instance.root!
    const snapOnConnection =
      snap ??
      new Connection(Connector.Root, this.dragged.block.connectors.internal)

    connectOnBlock.connect(
      this.dragged.block,
      snapOnConnection,
      new Coordinates(this.x, this.y)
    )

    // todo request rerender
    this.dragged = null
  }

  private getDraggedData(element: HTMLElement | null): RegisteredBlock | null {
    const draggableParent = this.findDragableParent(element)
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
