type EventMap = Record<string, any>
type EventKey<T extends EventMap> = string & keyof T
type EventReceiver<T> = (params: T) => void

export class Emitter<T extends EventMap> {
  private listeners: Record<string, EventReceiver<any>[]> = {}

  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    if (!this.listeners[eventName]) this.listeners[eventName] = []
    this.listeners[eventName].push(fn)
  }

  off<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.listeners[eventName] = this.listeners[eventName].filter(f => f !== fn)
    if (this.listeners[eventName].length === 0) delete this.listeners[eventName]
  }

  emit<K extends EventKey<T>>(eventName: K, params: T[K]) {
    const listeners = this.listeners[eventName]
    setTimeout(() => {
      if (listeners) {
        listeners.forEach(fn => fn(params))
      }
    }, 0)
  }
}
