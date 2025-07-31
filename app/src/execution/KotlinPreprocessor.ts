import { SourceMapGenerator, type RawSourceMap } from "source-map-js"
import { addMapping, mergeSourceMaps } from "./sourceMapUtils"

const INPUT_NAME = "code.kt"

/**
 * Preprocess Kotlin code before sending to transpilation
 * 1. Any methods that are not used in the code but will be called later have to be declared with @JsExport, otherwise the transpiler will remove them
 * 2. Any methods not defined in the code but will be provivided by the Executor have to be declared with @JsName(name) exernal fun, otherwise transpilation will fail
 * // todo declare app feature external funs
 */
export class KotlinPreprocessor {
  private code: string = ""
  private sourceMap: SourceMapGenerator = new SourceMapGenerator({ file: INPUT_NAME })

  preprocess(code: string): { code: string; sourceMap: RawSourceMap } {
    this.code = code
    this.initializeSourceMap()

    this.declareMethodExports()
    this.insertDebugStatements()

    return { code: this.code, sourceMap: this.sourceMap.toJSON() }
  }

  private declareMethodExports(): void {
    const methodsSourceMap = new SourceMapGenerator({ file: INPUT_NAME })
    const lines = this.code.split("\n")
    const processedLines: string[] = []
    let accumulatedOffset = 0

    lines.forEach((line, index) => {
      const modified = line.replace(/fun \w+\(/g, (match, offset) => {
        addMapping(methodsSourceMap, INPUT_NAME, index, index + accumulatedOffset, offset, offset)
        accumulatedOffset++
        return `@JsExport\n${match}`
      })

      addMapping(methodsSourceMap, INPUT_NAME, index, index + accumulatedOffset)
      processedLines.push(modified)
    }, this)

    this.code = processedLines.join("\n")
    this.sourceMap = mergeSourceMaps(this.sourceMap, methodsSourceMap)
  }

  private insertDebugStatements(): void {
    const debugStatementsSourceMap = new SourceMapGenerator({ file: INPUT_NAME })
    const lines = this.code.split("\n")
    const processedLines: string[] = []

    processedLines.push('@JsName("__lineExecutingCallback")\nexternal fun __lineExecutingCallback(line: Int): Unit')
    let accumulatedOffset = 2

    let blockDepth = 0
    let insideBlockComment = false

    lines.forEach((line, index) => {
      const trimmedLine = line.trim()

      if (trimmedLine.startsWith("/*")) {
        insideBlockComment = true
      }
      if (insideBlockComment && trimmedLine.endsWith("*/")) {
        insideBlockComment = false
        processedLines.push(line)
        return
      }
      if (trimmedLine.length === 0) {
        processedLines.push(line)
        return
      }

      // exclude
      const isComment = trimmedLine.startsWith("//")
      const isImport = trimmedLine.startsWith("import")
      const isPackage = trimmedLine.startsWith("package")
      const isDecorator = trimmedLine.startsWith("@")
      const isBlockOpening = trimmedLine.endsWith("{")
      const isBlockClosing = trimmedLine === "}"
      const isTopLevel = blockDepth === 0

      if (
        !insideBlockComment &&
        !isComment &&
        !isImport &&
        !isPackage &&
        !isDecorator &&
        !isBlockOpening &&
        !isBlockClosing &&
        !isTopLevel
      ) {
        processedLines.push(`${"\t".repeat(blockDepth)}__lineExecutingCallback(${index})`)
        accumulatedOffset++
      }

      processedLines.push(line) // original line
      addMapping(debugStatementsSourceMap, INPUT_NAME, index, index + accumulatedOffset)

      // block depth
      if (isBlockOpening) {
        blockDepth++
      }
      if (isBlockClosing) {
        blockDepth--
      }
    }, this)

    this.code = processedLines.join("\n")
    this.sourceMap = mergeSourceMaps(this.sourceMap, debugStatementsSourceMap)
  }

  private initializeSourceMap(): void {
    this.sourceMap = new SourceMapGenerator({ file: INPUT_NAME })
    const lines = this.code.split("\n")

    lines.forEach((_, index) => {
      addMapping(this.sourceMap, INPUT_NAME, index, index)
    }, this)
  }
}
