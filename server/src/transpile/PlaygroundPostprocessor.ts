export class PlaygroundPostprocessor {
  value: string = ""

  process(transpiled: string): string {
    this.value = transpiled
    return this.removeWrapperCall().removeDefaultOutput().alwaysFlushBuffer().value
    //.awaitLineCallback() doesn't yet work properly
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

  awaitLineCallback() {
    this.value = this.value.replace(/function (main|mainWrapper)\(\)/g, "async function $1()") // todo include all function names from the original code, and await their invocations
    this.value = this.value.replace(
      /__lineExecutingCallback\((\d+)\)/g,
      "await __lineExecutingCallback($1)"
    )
    return this
  }
}
