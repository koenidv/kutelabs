import { Coordinates } from "./Coordinates"

export function normalizePrimaryPointerPosition(e: MouseEvent | TouchEvent): Coordinates | null {
  if (typeof TouchEvent != "undefined" && e instanceof TouchEvent) {
    if (e.touches.length == 0) {
      if (e.changedTouches.length == 0) {
        console.error("Failed to get coordinates from touch event; no touches found", e)
        return null
      }
      return new Coordinates(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
    }
    return new Coordinates(e.touches[0].clientX, e.touches[0].clientY)
  }
  if (typeof MouseEvent != "undefined" && e instanceof MouseEvent) {
    return new Coordinates(e.clientX, e.clientY)
  }
  console.error("Failed to get coordinates from event", e)
  return null
}

function copyMouseEvent(evt: MouseEvent): MouseEvent {
  return new MouseEvent(evt.type, evt)
}

function copyTouchEvent(evt: TouchEvent): TouchEvent {
  return new TouchEvent(evt.type, {
    bubbles: evt.bubbles,
    cancelable: evt.cancelable,
    composed: evt.composed,
    touches: Array.from(evt.touches),
    targetTouches: Array.from(evt.targetTouches),
    changedTouches: Array.from(evt.changedTouches),
    view: evt.view,
  })
}

export function copyEvent(evt: MouseEvent | TouchEvent): MouseEvent | TouchEvent {
  return typeof TouchEvent != "undefined" && evt instanceof TouchEvent
    ? copyTouchEvent(evt as TouchEvent)
    : copyMouseEvent(evt as MouseEvent)
}

