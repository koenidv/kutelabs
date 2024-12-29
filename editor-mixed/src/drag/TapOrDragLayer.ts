import { html, LitElement } from "lit"
import { customElement } from "lit/decorators.js"
import type { Ref } from "lit/directives/ref.js"
import { copyEvent, normalizePrimaryPointerPosition } from "../util/InputUtils"
import type { Coordinates } from "../util/Coordinates"

@customElement("tap-or-drag-layer")
export class TapOrDragLayer extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this
  }

  declare tappableComponent: Ref<Element>
  declare draggableComponent: Ref<Element>
  declare dragTreshold: number
  declare focussable: boolean
  declare keyguard: boolean

  static properties = {
    tappableComponent: { type: Object },
    draggableComponent: { type: Object },
    dragTreshold: { type: Number, default: 8 },
    focussable: { type: Boolean, default: true },
    keyguard: { type: Boolean, default: true },
  }

  render() {
    return html`<slot></slot> `
  }

  initialCoords: Coordinates | null = null
  initialTime: number | null = null
  capturedEvents: (MouseEvent | TouchEvent)[] = []
  isFocusLocked: boolean = false
  observedFocusElement: Element | null = null

  /**
   * Calculates the distance between the start coords and the current event position
   * @param evt mouse or touch event to calculate the distance to
   * @returns distance between start and current or 0 if there was an error
   */
  private delta(evt: MouseEvent | TouchEvent): number {
    if (this.initialCoords == null) return 0
    const normalized = normalizePrimaryPointerPosition(evt)
    if (normalized == null) return 0
    return Math.hypot(normalized.x - this.initialCoords.x, normalized.y - this.initialCoords.y)
  }

  private releaseEvents(target: Element) {
    console.log("releasing events")
    if (this.initialTime == null) return
    this.initialTime = null
    this.dispatchEvents(target, this.capturedEvents)
    this.initialCoords = null
    this.capturedEvents = []
  }

  private dispatchEvents(target: Element, events: (MouseEvent | TouchEvent)[]) {
    events.forEach(evt => {
      target.dispatchEvent(copyEvent(evt))
    })
  }

  private onMouseDown(evt: MouseEvent | TouchEvent) {
    console.log("mouse down", "prevented", evt.defaultPrevented, "invalid", this.initialCoords != null || this.isFocusLocked, "coords", this.initialCoords, "locked", this.isFocusLocked)
    if (this.initialCoords !== null || this.isFocusLocked) return
    this.initialCoords = normalizePrimaryPointerPosition(evt)
    this.initialTime = Date.now()
    this.capturedEvents.push(evt)
    evt.preventDefault()
  }

  private onTouchStart(evt: TouchEvent) {
    if (this.initialCoords != null || this.isFocusLocked) return
    this.setTouchEvents(evt.target!)
    this.onMouseDown(evt)
  }

  /**
   * Touch events will break if the observed element is rerendered.
   * To fixes this by attaching the touchmove end listeners to the initial target
   * @param target target of the touchstart event
   */
  private setTouchEvents(target: EventTarget) {
    const onMove = this.onMouseMove.bind(this) as EventListener
    const onTouchEnd = ((e: TouchEvent) => {
      target.removeEventListener("touchmove", onMove)
      target.removeEventListener("touchend", onTouchEnd)
      this.onMouseUp(e)
    }).bind(this) as EventListener

    target.addEventListener("touchmove", onMove)
    target.addEventListener("touchend", onTouchEnd)
  }

  private onMouseMove(evt: MouseEvent | TouchEvent) {
    console.log("mouse move", "prevented", evt.defaultPrevented, "invalid/locked", this.initialTime == null || this.initialCoords == null || this.isFocusLocked)
    if (this.initialTime == null || this.initialCoords == null || this.isFocusLocked) return
    this.capturedEvents.push(evt)
    evt.preventDefault()
    console.log("delta", this.delta(evt), "treshold", this.dragTreshold ?? 8)
    if (this.delta(evt) > (this.dragTreshold ?? 8)) {
      console.log("release from mouse move")
      this.releaseEvents(this.draggableComponent?.value ?? this)
    }
  }

  private onMouseUp(evt: MouseEvent | TouchEvent) {
    console.log("mouse up", "prevented", evt.defaultPrevented, "invalid/locked", this.initialTime == null || this.initialCoords == null || this.isFocusLocked)
    if (this.initialTime == null || this.initialCoords == null || this.isFocusLocked) return
    this.capturedEvents.push(evt)
    evt.preventDefault()
    console.log("release from mouse up")
    this.releaseEvents(
      (this.delta(evt) > (this.dragTreshold ?? 8) && Date.now() - this.initialTime > 200
        ? this.draggableComponent?.value
        : this.tappableComponent?.value) ?? this
    )
  }

  private onFocusIn = () => {
    this.isFocusLocked = true
  }
  private onFocusOut = () => {
    this.isFocusLocked = false
  }

  private onInvokeKeyguard(evt: Event) {
    // fixme keyguard will need to be a separate layer over the textarea with tabindex=0 whereas the input has tabindex=-1

    if (this.isFocusLocked) return
    if ((evt as KeyboardEvent).key == "Enter") {
      this.isFocusLocked = true
    }
    evt.preventDefault()
  }

  connectedCallback(): void {
    this.addEventListener("mousedown", this.onMouseDown.bind(this))
    this.addEventListener("mousemove", this.onMouseMove.bind(this))
    this.addEventListener("mouseup", this.onMouseUp.bind(this))
    this.addEventListener("mouseleave", this.onMouseUp.bind(this))
    this.addEventListener("touchstart", this.onTouchStart.bind(this))

    if (this.focussable ?? true) {
      this.tappableComponent.value?.addEventListener("focusin", this.onFocusIn)
      this.tappableComponent.value?.addEventListener("focusout", this.onFocusOut)
    }

    if (this.keyguard ?? true) {
      if (!(this.focussable ?? true))
        console.warn("Tap/Drag keyguard will not work on a non-focussable element")
      this.tappableComponent.value?.addEventListener("keydown", this.onInvokeKeyguard.bind(this))
    }
  }

  disconnectedCallback(): void {
    this.removeEventListener("mousedown", this.onMouseDown.bind(this))
    this.removeEventListener("mousemove", this.onMouseMove.bind(this))
    this.removeEventListener("mouseup", this.onMouseUp.bind(this))
    this.removeEventListener("mouseleave", this.onMouseUp.bind(this))
    this.removeEventListener("touchstart", this.onTouchStart.bind(this))

    if (this.focussable ?? true) {
      this.tappableComponent.value?.removeEventListener("focusin", this.onFocusIn)
      this.tappableComponent.value?.removeEventListener("focusout", this.onFocusOut)
    }
    if (this.keyguard ?? true) {
      this.tappableComponent.value?.removeEventListener("keydown", this.onInvokeKeyguard.bind(this))
    }
  }
}
