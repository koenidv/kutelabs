export class Callback {
  private readonly fn: (...data: any[]) => void
  private calls: any[][] = []

  constructor(fn: (...data: any[]) => void) {
    this.fn = fn
  }

  public invoke(...data: any[]): boolean {
    try {
      this.calls.push(data)
      this.fn(...data)
      return true
    } catch (error) {
      console.error("Error invoking callback", error)
      return false
    }
  }

  public getCalls() {
    return [...this.calls]
  }

  public clearCalls() {
    this.calls = []
  }

  public wasCalledWith(testFn: (...args: any[]) => boolean): boolean {
    return this.calls.some(testFn)
  }
}
