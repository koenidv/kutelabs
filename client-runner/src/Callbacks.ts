const MSG_TYPE_CALLBACK = "callback"

export class Callbacks {
  private _callbacks: Map<string, (data: any) => void>
  public get callbacks(): Map<string, (data: any) => void> {
    return this._callbacks
  }

  constructor(callbacks: { [name: string]: (data: any) => void } = {}) {
    this._callbacks = new Map(Object.entries(callbacks))
  }

  public proxies(): { [name: string]: string }[] {
    return [...this._callbacks.keys()].map(name => ({
      [name]: `(it) => {postMessage({type:"${MSG_TYPE_CALLBACK}",data:{name:"${name}",data:it}})}`,
    }))
  }

  public onWorkerMessage(e: MessageEvent<any>): boolean {
    const { type, data } = e.data
    if (type != MSG_TYPE_CALLBACK) return false
    return this.invokeCallback(data.name, data.data)
  }

  private invokeCallback(name: string, data: any): boolean {
    try {
      if (!this._callbacks.has(name)) {
        console.error(`Sandbox callback ${name} not found`)
        return false
      }
      this._callbacks.get(name)?.(data)
      return true
    } catch (error) {
      console.error(`Error invoking sandbox callback ${name}`, error)
      return false
    }
  }
}
