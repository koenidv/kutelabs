import type { Ref } from "lit/directives/ref.js"

export class PanZoomHelper {
  private readonly workspaceRef: Ref<SVGSVGElement>
  private readonly syncRefs: Ref<SVGSVGElement>[]

  private panFactor = 1.3
  private zoomFactor = 1.5
  private bounds = {
    minX: -400,
    minY: -400,
    minZoom: 400,
    maxX: 400,
    maxY: 400,
    maxZoom: 2000,
  } // todo make configurable and use factors of the original size for zoom

  constructor(
    workspaceRef: Ref<SVGSVGElement>,
    syncRefs: Ref<SVGSVGElement>[] = []
  ) {
    this.workspaceRef = workspaceRef
    this.syncRefs = syncRefs
  }

  // todo on first interaction, observe a few events to determine trackpad or mouse
  // then wheel for zoom on mouse and for pan on trackpad
  // todo handle deltaMode (0: pixels, 1: lines, 2: pages), different browsers have different defaults

  // todo click/touch pan events
  // todo pinch zoom events

  onWheel(evt: WheelEvent) {
    if (evt.shiftKey) return // escape panzoom on shift
    evt.preventDefault()
    this.handleTrackpadWheel(evt)
  }

  private handleTrackpadWheel(evt: WheelEvent) {
    if (evt.ctrlKey || evt.metaKey) this.zoom(evt.deltaY)
    else this.pan(evt.deltaX, evt.deltaY)
  }

  private pan(deltaX: number, deltaY: number) {
    // todo ease animval with easing
    const viewBox = this.workspaceRef?.value?.viewBox.baseVal
    if (!viewBox) {
      console.error("Could not pan; Workspace not initialized")
      return
    }
    const width = (viewBox.x + deltaX * this.panFactor).coerceIn(this.bounds.minX, this.bounds.maxX)
    const height = (viewBox.y + deltaY * this.panFactor).coerceIn(
      this.bounds.minY,
      this.bounds.maxY
    )

    viewBox.x = width
    viewBox.y = height
    console.log(this.syncRefs)
    this.syncRefs.forEach(ref => {
      ref.value?.viewBox?.baseVal?.let(it => {
        it.x = width
        it.y = height
      })
    })
  }

  private zoom(delta: number) {
    // todo zoom to cursor
    const viewBox = this.workspaceRef?.value?.viewBox.baseVal
    if (!viewBox) {
      console.error("Could not zoom; Workspace not initialized")
      return
    }
    const newSize = (viewBox.width + delta * this.zoomFactor).coerceIn(
      this.bounds.minZoom,
      this.bounds.maxZoom
    )
    const appliedDelta = newSize - viewBox.width
    viewBox.width = viewBox.height = newSize

    this.syncRefs.forEach(ref => {
      ref.value?.viewBox?.baseVal?.let(it => {
        it.width = it.height = newSize
      })
    })

    this.pan(-appliedDelta / 2, -appliedDelta / 2)
  }
}
