import type { Ref } from "lit/directives/ref.js"
import { ScrollInputHelper } from "./ScrollInputHelper"

export class PanZoomHelper {
  private readonly workspaceRef: Ref<SVGSVGElement>
  private readonly syncRefs: Ref<SVGSVGElement>[]
  private readonly scrollInputHelper: ScrollInputHelper

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

  constructor(workspaceRef: Ref<SVGSVGElement>, syncRefs: Ref<SVGSVGElement>[] = [], scrollInputHelper: ScrollInputHelper = new ScrollInputHelper()) {
    this.workspaceRef = workspaceRef
    this.syncRefs = syncRefs
    this.scrollInputHelper = scrollInputHelper
  }

  //#region Workspace mutation

  private pan(deltaX: number, deltaY: number, panFactor = this.panFactor) {
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

  // todo on first interaction, observe a few events to determine trackpad or mouse
  // then wheel for zoom on mouse and for pan on trackpad
  // todo handle deltaMode (0: pixels, 1: lines, 2: pages), different browsers have different defaults

  //#region Trackpad / Mouse Wheel

  onWheel(evt: WheelEvent) {
    if (evt.shiftKey) return // escape panzoom on shift
    evt.preventDefault()
    this.handleTrackpadWheel(evt)
  }

  private handleTrackpadWheel(evt: WheelEvent) {
    if (evt.ctrlKey || evt.metaKey) this.zoom(evt.deltaY, evt.clientX, evt.clientY)
    else this.pan(evt.deltaX, evt.deltaY)
  }

  //#region Mouse Panning

  private userInputActive: boolean = false

  onMouseDown(evt: MouseEvent) {
    if ((evt.target as SVGElement).id != "workspace-background") return
    evt.preventDefault()
    this.userInputActive = true
  }

  onMouseMove(evt: MouseEvent) {
    const ctm = this.workspaceRef.value?.getScreenCTM()
    if (!this.userInputActive || !ctm) return
    evt.preventDefault()
    this.pan(-evt.movementX / ctm.a, -evt.movementY / ctm.d, 1)
  }

  onMouseUpOrLeave() {
    this.userInputActive = false
  }

  //#region Touch Pan & Zoom

  private lastTouches: { x: number; y: number }[] = []

  onTouchStart(evt: TouchEvent) {
    if ((evt.touches[0].target as SVGElement).id != "workspace-background") return
    evt.preventDefault()

    this.userInputActive = true
    this.setTouches(evt)
  }

  private setTouches(evt: TouchEvent) {
    this.lastTouches = Array.from({ length: evt.touches.length }, (_, i) => ({
      x: evt.touches[i].clientX,
      y: evt.touches[i].clientY,
    }))
  }

  onTouchMove(evt: TouchEvent) { 
    if (!this.userInputActive) return

    if (evt.touches.length == 1) this.handleTouchPan(evt)
    else this.handlePinchZoom(evt)
  }

  /**
   * When one touch is registered, pan the workspace by the delta from the last touch
   * @param evt
   * @returns
   */
  private handleTouchPan(evt: TouchEvent) {
    const ctm = this.workspaceRef.value?.getScreenCTM()
    if (!this.userInputActive || !ctm) return
    evt.preventDefault()

    this.pan(
      -(evt.touches[0].clientX - this.lastTouches[0].x) / ctm.a,
      -(evt.touches[0].clientY - this.lastTouches[0].y) / ctm.d,
      1
    )

    this.setTouches(evt)
  }

  /**
   * When two touches are registered, zoom in or out based on the distance between them
   * @param evt current touch event including two touches
   */
  private handlePinchZoom(evt: TouchEvent) {
    if (!this.userInputActive) return
    evt.preventDefault()

    const previousDelta = Math.hypot(
      this.lastTouches[0].x - this.lastTouches[1].x,
      this.lastTouches[0].y - this.lastTouches[1].y
    )
    const currentDelta = Math.hypot(
      evt.touches[0].clientX - evt.touches[1].clientX,
      evt.touches[0].clientY - evt.touches[1].clientY
    )
    const center = {
      x: (evt.touches[0].clientX + evt.touches[1].clientX) / 2,
      y: (evt.touches[0].clientY + evt.touches[1].clientY) / 2,
    }

    this.zoom(previousDelta - currentDelta, center.x, center.y, this.zoomFactor)

    this.setTouches(evt)
  }

  onTouchEnd(evt: TouchEvent) {
    this.setTouches(evt)
    if (this.lastTouches.length == 0) this.userInputActive = false
  }
}
