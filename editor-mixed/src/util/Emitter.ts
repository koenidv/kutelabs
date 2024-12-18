// rj zaworski, 20.10.2019, https://rjzaworski.com/2019/10/event-emitters-in-typescript

import { EventEmitter } from "events"

type EventMap = Record<string, any>
type EventKey<T extends EventMap> = string & keyof T
type EventReceiver<T> = (params: T) => void

export class Emitter<T extends EventMap> {
  private emitter = new EventEmitter()
  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.emitter.on(eventName, fn)
  }

  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.emitter.off(eventName, fn)
  }

  emit<K extends EventKey<T>>(eventName: K, params: T[K]) {
    this.emitter.emit(eventName, params)
  }
}
