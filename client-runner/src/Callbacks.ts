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

  public onWorkerMessage(e: MessageEvent<any>) {
    const { type, data } = e.data
    if (type != MSG_TYPE_CALLBACK) return
    this.invokeCallback(data.name, data.data)
  }

  private invokeCallback(name: string, data: any) {
    try {
      if (!this.callbacks.has(name)) {
        console.error(`Sandbox callback ${name} not found`)
        return
      }
      this.callbacks.get(name)?.(data)
    } catch (error) {
      console.error(`Error invoking sandbox callback ${name}`, error)
    }
  }
}
