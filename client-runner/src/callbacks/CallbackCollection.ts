import type { NestedCallbacks, NestedFunctions, NestedStrings } from "../types/nested.types"
import { Callback } from "./Callback"

const MSG_TYPE_CALLBACK = "callback"

export class CallbackCollection {
  private _callbacks: NestedCallbacks
  public get callbacks(): NestedCallbacks {
    return this._callbacks
  }

  constructor(functions: NestedFunctions = {}) {
    this._callbacks = this.functionsToCallbacks(functions)

    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target) {
          return (target as any)[prop]
        }
        if (typeof prop === "string") {
          return target.getCallback(prop)
        }
        return undefined
      },
    })
  }

  //#region public

  public proxies(): NestedStrings {
    return this.callbacksToProxies(this._callbacks)
  }

  public getCallback(path: string): Callback | null {
    return this.findByPath(this.splitPath(path))
  }

  public onWorkerMessage(e: MessageEvent<any>): boolean {
    const { type, data } = e.data
    if (type != MSG_TYPE_CALLBACK) return false
    return this.invokeCallback(data.path, data.data)
  }

  public flattenedCallbacks(): Record<string, Callback> {
    const flattened: Record<string, Callback> = {}
    const traverse = (callbacks: NestedCallbacks, path: string[] = []) => {
      for (const [name, callback] of Object.entries(callbacks)) {
        if (callback instanceof Callback) {
          flattened[[...path, name].join(".")] = callback
        } else {
          traverse(callback, [...path, name])
        }
      }
    }
    traverse(this._callbacks)
    return flattened
  }

  public resetCalls() {
    this.clearAllCalls()
  }

  //#region private

  private functionsToCallbacks(functions: NestedFunctions): NestedCallbacks {
    const callbacks: NestedCallbacks = {}
    for (const [name, fn] of Object.entries(functions)) {
      if (typeof fn == "function") {
        callbacks[name] = new Callback(fn)
      } else {
        callbacks[name] = this.functionsToCallbacks(fn)
      }
    }
    return callbacks
  }

  private callbacksToProxies(callbacks: NestedCallbacks, path: string[] = []): NestedStrings {
    const proxies: NestedStrings = {}
    for (const [name, callback] of Object.entries(callbacks)) {
      proxies[name] =
        callback instanceof Callback
          ? `(it) => {postMessage({type:"${MSG_TYPE_CALLBACK}",data:{path:"${[...path, name].join(".")}",data:it}})}`
          : this.callbacksToProxies(callback, [...path, name])
    }
    return proxies
  }

  private invokeCallback(pathString: string, data: any): boolean {
    try {
      const callback = this.findByPath(this.splitPath(pathString))
      if (!callback) {
        console.error(`Sandbox callback ${pathString} not found`)
        return false
      }
      return callback.invoke(data)
    } catch (error) {
      console.error(`Error invoking sandbox callback ${pathString}`, error)
      return false
    }
  }

  private clearAllCalls(callbacks: NestedCallbacks = this._callbacks) {
    for (const callback of Object.values(callbacks)) {
      if (callback instanceof Callback) callback.clearCalls()
      else this.clearAllCalls(callback)
    }
  }

  private findByPath(path: string[], current = this._callbacks): Callback | null {
    const nextPath = path.shift()
    if (!nextPath) return null
    const next = current[nextPath]
    if (!next) return null
    if (next instanceof Callback) return next
    return this.findByPath(path, next)
  }

  private splitPath(pathString: string): string[] {
    return pathString.split(".")
  }
}
