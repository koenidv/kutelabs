export class PlaygroundPostprocessor {
  value: string

  constructor(transpiled: string) {
    this.value = transpiled
  }

  run(): string {
    return this.removeWrapperCall().removeDefaultOutput().alwaysFlushBuffer().value
  }

  removeWrapperCall() {
    this.value = this.value.replace("mainWrapper();", "_.main = mainWrapper;")
    return this
  }

  removeDefaultOutput() {
    this.value = this.value.replace("playground.output?.buffer_1;", "")
    return this
  }

  alwaysFlushBuffer() {
    this.value = this.value.replace(
      "this.print_o1pwgy_k$('\\n');",
      "console.log(this.buffer_1);\n this.buffer_1 = '';"
    )
    return this
  }
}
