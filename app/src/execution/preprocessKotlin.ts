import { SourceMapGenerator, type RawSourceMap } from "source-map-js"

const INPUT_NAME = "code.kt"

/**
 * Preprocess Kotlin code before sending to transpilation
 * 1. Any methods that are not used in the code but will be called later have to be declared with @JsExport, otherwise the transpiler will remove them
 * 2. Any methods not defined in the code but will be provivided by the Executor have to be declared with @JsName(name) exernal fun, otherwise transpilation will fail
 * // todo declare app feature external funs
 */
export function preprocessKotlin(code: string): { code: string; sourceMap: RawSourceMap } {
  const map = new SourceMapGenerator({ file: INPUT_NAME })
  code = declareMethodExports(code, map)

  return { code, sourceMap: map.toJSON() }
}

function declareMethodExports(code: string, mapGenerator: SourceMapGenerator): string {
  let out: string[] = []
  let accumulatedOffset = 0

  code.split("\n").forEach((line, index) => {
    const modified = line.replace(/fun \w+\(/g, (match, offset) => {
      mapGenerator.addMapping({
        generated: {
          line: index + 1 + accumulatedOffset++,
          column: offset,
        },
        original: {
          line: index + 1,
          column: offset,
        },
        source: INPUT_NAME,
      })
      return `@JsExport\n${match}`
    })
    // map each line, this will break cols but they shouldn't be modified by preprocessing, so the original can be used
    mapGenerator.addMapping({
      generated: {
        line: index + 1 + accumulatedOffset,
        column: 0,
      },
      original: {
        line: index + 1,
        column: 0,
      },
      source: INPUT_NAME,
    })
    out.push(modified)
  })

  return out.join("\n")
}
