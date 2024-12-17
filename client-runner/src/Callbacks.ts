const MSG_TYPE_CALLBACK = "callback"

export class Callbacks {
  private callbacks: Map<string, (data: any) => void>

  constructor(callbacks: { [name: string]: (data: any) => void } = {}) {
    this.callbacks = new Map(Object.entries(callbacks))
  }

  public proxies(): { [name: string]: (data: any) => void }[] {
    return [...this.callbacks.keys()].map(name => ({
      [name]: (data: any) => {
        postMessage({ type: MSG_TYPE_CALLBACK, data: { name, data } })
      },
    }))
  }

  public onWorkerMessage(e: MessageEvent<any>): boolean {
    const { type, data } = e.data
    if (type != MSG_TYPE_CALLBACK) return false
    return this.invokeCallback(data.name, data.data)
  }

  private invokeCallback(name: string, data: any): boolean {
    try {
      if (!this.callbacks.has(name)) {
        console.error(`Sandbox callback ${name} not found`)
        return false
      }
      this.callbacks.get(name)?.(data)
      return true
    } catch (error) {
      console.error(`Error invoking sandbox callback ${name}`, error)
      return false
    }
  }
}
