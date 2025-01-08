import type { Ref } from "lit/directives/ref.js"
import { ScrollInputHelper, ScrollInputType } from "./ScrollInputHelper"

const MotionKeys: Record<string, true> = {
  w: true,
  a: true,
  s: true,
  d: true,
  "+": true,
  "-": true,
}

export class PanZoomHelper {
  private readonly workspaceRef: Ref<SVGSVGElement>
  private readonly syncRefs: Ref<SVGSVGElement>[]
  private readonly scrollInputHelper: ScrollInputHelper

  private panSpeed = 1.3
  private panSpeedTouch = 1
  private panSpeedKeyboard = 4
  private zoomSpeed = 1.2
  private zoomSpeedTouch = 0.6
  private zoomSpeedKeyboard = 1.4
  private bounds = {
    minX: -1000,
    minY: -1000,
    minZoom: 300,
    maxX: 1000,
    maxY: 1000,
    maxZoom: 2000,
  } // todo make configurable and use factors of the original size for zoom

  private initialWorkspaceSize: { width: number; height: number } | null = null
  private onScaleChanged: (scale: number) => void = () => {}

  private removeWidgets: () => void

  constructor(
    workspaceRef: Ref<SVGSVGElement>,
    syncRefs: Ref<SVGSVGElement>[] = [],
    onScaleChanged: (scale: number) => void = () => {},
    scrollInputHelper: ScrollInputHelper = new ScrollInputHelper(),
    removeWidgets: () => void
  ) {
    this.workspaceRef = workspaceRef
    this.syncRefs = syncRefs
    this.scrollInputHelper = scrollInputHelper
    this.onScaleChanged = onScaleChanged
    this.removeWidgets = removeWidgets
  }

  //#region Workspace mutation

  private pan(deltaX: number, deltaY: number, panFactor = this.panSpeed) {
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

    this.removeWidgets()
  }

  private zoom(delta: number, cursorX?: number, cursorY?: number, zoomFactor = this.zoomSpeed) {
    this.setInitialWorkspaceSize()
    const viewBox = this.workspaceRef?.value?.viewBox.baseVal
    const clientRect = this.workspaceRef?.value?.getBoundingClientRect()
    const ctm = this.workspaceRef?.value?.getScreenCTM()
    if (!viewBox || !clientRect || !ctm) {
      console.error("Could not zoom; Workspace not initialized")
      return
    }

    const modifier = (1 + (delta / 100) * zoomFactor).coerceIn(0.5, 1.5)
    const oldSize = viewBox.width
    const newSize = (viewBox.width * modifier).coerceIn(this.bounds.minZoom, this.bounds.maxZoom)

    const appliedFactor = viewBox.width / newSize - 1
    viewBox.width = viewBox.height = newSize

    this.syncRefs.forEach(ref => {
      ref.value?.viewBox?.baseVal?.let(it => {
        it.width = it.height = newSize
      })
    })

    let percentX = 0.5
    let percentY = 0.5
    if (cursorX) percentX = (cursorX - clientRect.x) / clientRect.width
    if (cursorY) percentY = (cursorY - clientRect.y) / clientRect.height

    this.pan(percentX * oldSize * appliedFactor, percentY * oldSize * appliedFactor, 1)

    this.removeWidgets()
    this.onScaleChanged(newSize / this.initialWorkspaceSize!.width)
  }

  /**
   * Zoom a step
   * @param stepModifier positive to zoom out, negative to zoom in
   */
  public zoomStep(stepModifier: number) {
    this.zoom(stepModifier, undefined, undefined, this.zoomSpeedKeyboard)
  }

  private setInitialWorkspaceSize() {
    if (this.initialWorkspaceSize != null) return
    this.initialWorkspaceSize = {
      width: this.workspaceRef.value?.viewBox.baseVal.width ?? 0,
      height: this.workspaceRef.value?.viewBox.baseVal.height ?? 0,
    }
  }

  //#region Trackpad / Mouse Wheel

  onWheel(evt: WheelEvent) {
    const ctm = this.workspaceRef.value?.getScreenCTM()
    if (evt.shiftKey || ctm == null) return // escape panzoom on shift
    evt.preventDefault()

    if (
      evt.ctrlKey ||
      evt.metaKey ||
      this.scrollInputHelper.determineInputType(evt) == ScrollInputType.Mouse
    ) {
      this.zoom(evt.deltaY, evt.clientX, evt.clientY)
    } else {
      this.pan(evt.deltaX, evt.deltaY, 1 / ctm.a)
    }
  }

  //#region Mouse Panning

  private userInputActive: boolean = false

  onMouseDown(evt: MouseEvent) {
    if (evt.button != 0 || (evt.target as SVGElement).id != "workspace-background") return
    evt.preventDefault()
    this.userInputActive = true
    this.removeWidgets()
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
    this.removeWidgets()
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
      -(evt.touches[0].clientX - this.lastTouches[0].x),
      -(evt.touches[0].clientY - this.lastTouches[0].y),
      this.panSpeedTouch / ctm.a
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

    this.zoom(previousDelta - currentDelta, center.x, center.y, this.zoomSpeedTouch)

    this.setTouches(evt)
  }

  onTouchEnd(evt: TouchEvent) {
    this.setTouches(evt)
    if (this.lastTouches.length == 0) this.userInputActive = false
  }

  //#region Keyboard Interaction

  pressedKeys = new Set<keyof typeof MotionKeys>()
  keyMovementInterval: Timer | null = null

  onKeydown(evt: KeyboardEvent) {
    if (evt.defaultPrevented) return
    if (!Object.keys(MotionKeys).includes(evt.key)) return
    this.pressedKeys.add(evt.key)
    this.startKeyMovement()
  }

  onKeyup(evt: KeyboardEvent) {
    if (evt.defaultPrevented) return
    if (!Object.keys(MotionKeys).includes(evt.key)) return
    this.pressedKeys.delete(evt.key)
    if (this.pressedKeys.size == 0 && this.keyMovementInterval) {
      clearInterval(this.keyMovementInterval)
      this.keyMovementInterval = null
    }
  }

  startKeyMovement() {
    if (this.keyMovementInterval) return
    this.keyMovementInterval = setInterval(() => {
      if (this.pressedKeys.has("w")) this.pan(0, -1, this.panSpeedKeyboard)
      if (this.pressedKeys.has("a")) this.pan(-1, 0, this.panSpeedKeyboard)
      if (this.pressedKeys.has("s")) this.pan(0, 1, this.panSpeedKeyboard)
      if (this.pressedKeys.has("d")) this.pan(1, 0, this.panSpeedKeyboard)
      if (this.pressedKeys.has("+")) this.zoom(-1, undefined, undefined, this.zoomSpeedKeyboard)
      if (this.pressedKeys.has("-")) this.zoom(1, undefined, undefined, this.zoomSpeedKeyboard)
    }, 5)
  }
}
