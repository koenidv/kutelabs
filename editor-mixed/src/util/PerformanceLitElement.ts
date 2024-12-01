import { LitElement } from "lit"

export abstract class PerformanceLitElement extends LitElement {
  executionTimes: number[] = []
  firstRender = true

  protected render() {
    const start = performance.now()
    const result = this.renderContent()
    const end = performance.now()

    if (this.firstRender) {
      console.log(`First of ${this.constructor.name} render took ${end - start}ms`)
      this.firstRender = false
    } else {
      this.executionTimes.push(end - start)
      if (this.executionTimes.length == 1000) {
        console.log(
          `${this.constructor.name} | avg render time d1000`,
          this.executionTimes.reduce((acc, curr) => acc + curr, 0) / this.executionTimes.length,
          "ms"
        )
        this.executionTimes = []
      }
    }
    return result
  }

  protected abstract renderContent(): ReturnType<LitElement["render"]>
}
