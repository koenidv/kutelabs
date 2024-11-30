import type { Ref } from "lit/directives/ref.js"

export class PanZoomHelper {
  private readonly workspaceRef: Ref<SVGSVGElement>
  private readonly syncRefs: Ref<SVGSVGElement>[]

  private panFactor = 1.3
  private zoomFactor = 1.5
  private bounds = {
    minX: -1000,
    minY: -1000,
    minZoom: 300,
    maxX: 1000,
    maxY: 1000,
    maxZoom: 2000,
  } // todo make configurable and use factors of the original size for zoom

  constructor(workspaceRef: Ref<SVGSVGElement>, syncRefs: Ref<SVGSVGElement>[] = []) {
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
    if (evt.ctrlKey || evt.metaKey) this.zoom(evt.deltaY, evt.clientX, evt.clientY)
    else this.pan(evt.deltaX, evt.deltaY)
  }

  private pan(deltaX: number, deltaY: number, panFactor = this.panFactor) {
    // todo ease animval with easing
    const viewBox = this.workspaceRef?.value?.viewBox.baseVal
    if (!viewBox) {
      console.error("Could not pan; Workspace not initialized")
      return
    }
    const x = (viewBox.x + deltaX * panFactor).coerceIn(this.bounds.minX, this.bounds.maxX)
    const y = (viewBox.y + deltaY * panFactor).coerceIn(this.bounds.minY, this.bounds.maxY)

    viewBox.x = x
    viewBox.y = y
    this.syncRefs.forEach(ref => {
      ref.value?.viewBox?.baseVal?.let(it => {
        it.x = x
        it.y = y
      })
    })
  }

  private zoom(delta: number, cursorX?: number, cursorY?: number, zoomFactor = this.zoomFactor) {
    const viewBox = this.workspaceRef?.value?.viewBox.baseVal
    const clientRect = this.workspaceRef?.value?.getBoundingClientRect()
    if (!viewBox || !clientRect) {
      console.error("Could not zoom; Workspace not initialized")
      return
    }

    const newSize = (viewBox.width + delta * zoomFactor).coerceIn(
      this.bounds.minZoom,
      this.bounds.maxZoom
    )

    if (cursorX != null && cursorY != null) {
      cursorX = ((cursorX - clientRect.left) / clientRect.width) * viewBox.width
      cursorY = ((cursorY - clientRect.top) / clientRect.height) * viewBox.height
    }

    const appliedDelta = newSize - viewBox.width
    viewBox.width = viewBox.height = newSize

    this.syncRefs.forEach(ref => {
      ref.value?.viewBox?.baseVal?.let(it => {
        it.width = it.height = newSize
      })
    })

    if (!cursorX || !cursorY) {
      this.pan(-appliedDelta / 2, -appliedDelta / 2, 1)
      return
    }

    this.pan(
      -cursorX * (appliedDelta / viewBox.width),
      -cursorY * (appliedDelta / viewBox.height),
      1
    )
  }
}