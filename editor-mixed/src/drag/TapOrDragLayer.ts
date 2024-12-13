import { html, LitElement, svg, type PropertyValues } from "lit"
import { customElement } from "lit/decorators.js"
import type { Ref } from "lit/directives/ref.js"

@customElement("tap-or-drag-layer")
export class TapOrDragLayer extends LitElement {
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this
  }

  declare tappableComponent: Ref<Element>
  declare draggableComponent: Ref<Element>
  declare dragTreshold: number

  static properties = {
    tappableComponent: { type: Object },
    draggableComponent: { type: Object },
    dragTreshold: { type: Number, default: 8 },
  }

  render() {
    return html`<slot></slot> `
  }

  initialEvent: MouseEvent | null = null
  initialTime: number | null = null
  capturedEvents: MouseEvent[] = []

  private delta(evt: MouseEvent) {
    if (this.initialEvent == null) return 0
    return Math.hypot(
      evt.screenX - this.initialEvent.screenX,
      evt.screenY - this.initialEvent.screenY
    )
  }

  private releaseEvents(target: Element) {
    if (this.initialEvent == null) return
    this.initialTime = null
    this.dispatchMouseEvents(target, [this.initialEvent, ...this.capturedEvents])
    this.initialEvent = null
    this.capturedEvents = []
  }

  private dispatchMouseEvents(target: Element, events: MouseEvent[]) {
    events.forEach(evt => {
      target.dispatchEvent(new MouseEvent(evt.type, evt))
    })
  }

  connectedCallback(): void {
    this.addEventListener("mousedown", evt => {
      if (this.initialEvent != null) return
      this.initialEvent = evt
      this.initialTime = Date.now()
      evt.preventDefault()
    })
    this.addEventListener("mousemove", evt => {
      if (this.initialTime == null || this.initialEvent == null) return
      this.capturedEvents.push(evt)
      evt.preventDefault()
      if (this.delta(evt) > (this.dragTreshold ?? 8)) {
        this.releaseEvents(this.draggableComponent?.value ?? this)
      }
    })
    this.addEventListener("mouseup", evt => {
      if (this.initialTime == null || this.initialEvent == null) return
      this.capturedEvents.push(evt)
      evt.preventDefault()

      this.releaseEvents(
        (this.delta(evt) >= (this.dragTreshold ?? 8) && Date.now() - this.initialTime > 200
          ? this.draggableComponent?.value
          : this.tappableComponent?.value) ?? this
      )
    })
  }
}
