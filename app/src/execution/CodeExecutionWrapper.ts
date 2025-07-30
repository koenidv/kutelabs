import { ErrorType } from "@kutelabs/client-runner/src/Executor"
import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"
import { TranspilationStatus } from "@kutelabs/server/src/routes/transpile/Status"
import type { Atom } from "nanostores"
import {
  SourceMapConsumer,
  type MappedPosition,
  type MappingItem,
  type RawSourceMap,
} from "source-map-js"
import type { EditorCodeInterface } from "../components/EditorCodeWrapper.svelte"
import {
  addLog,
  clearMessages,
  displayMessage,
  editorLoadingState,
  editorRef,
} from "../state/state"
import { BaseExecutionWrapper } from "./BaseExecutionWrapper"
import { appFeatures, filterCallbacks } from "./EnvironmentContext"
import { preprocessKotlin } from "./preprocessKotlin"
import { transpileKtJs } from "./transpile"

const ORIGINAL_SOURCE_NAME = "code.kt"
const FALLBACK_FIND_ORIGINAL_MAX_DELTA = 5

export class CodeExecutionWrapper extends BaseExecutionWrapper {
  editorRef = editorRef as Atom<EditorCodeInterface>
  preprocessSourceMap: RawSourceMap | null = null
  transpileSourceMap: string | null = null

  public run(): void {
    const editor = this.editorRef.get()
    this.runFailed.set(false)
    displayMessage("Processing", "info", { duration: -1, single: true })

    const code = editor.code()
    if (!code) {
      displayMessage("Write some code first", "info", { single: true })
      return
    }
    this.running.set(true)
    editorLoadingState.set(true)

    this.transpileAndRun(editor, code, this.abortController)
  }

  private transpileAndRun(
    editor: EditorCodeInterface,
    code: string,
    abortController: AbortController
  ) {
    const preprocessed = preprocessKotlin(code)
    this.preprocessSourceMap = preprocessed.sourceMap
    transpileKtJs(abortController, preprocessed.code, "main", false, true)
      .then(transpiled => {
        if (
          transpiled === null ||
          transpiled.status != TranspilationStatus.Success ||
          !transpiled.transpiledCode
        ) {
          return this.onTranspilationError(transpiled, editor.entrypoint())
        }
        editorLoadingState.set(false)
        clearMessages()
        this.editorRef.get().clearHighlight()
        this.runFailed.set(false)

        // todo handle transpiler hints and no sourcemap

        this.transpileSourceMap = transpiled.sourceMap
        this.testRunner.execute(transpiled.transpiledCode, {
          argNames: editor.argnames(),
          entrypoint: transpiled.entrypoint ?? `transpiled.${editor.entrypoint()}`,
          callbacks: filterCallbacks([], appFeatures), // todo app features, these will also have to be defined before the kotlin code
          timeout: 1000,
        })
      })
      .catch(err => {
        editorLoadingState.set(false)
        this.running.set(false)
        this.runFailed.set(true)
        clearMessages()
        if (err == "Execution stopped") return
        console.error("Transpilation: Fetch failed", err)
        if (err.message.includes("Unauthorized")) {
          displayMessage("Please sign in", "error", { single: true })
        } else {
          displayMessage("Transpilation currently unavailable", "error", { single: true })
        }
      })
  }

  public printKt() {
    console.log(this.editorRef.get().code())
  }

  public printJs() {
    editorLoadingState.set(true)
    this.running.set(true)
    transpileKtJs(this.abortController, this.editorRef.get().code() ?? "", "main")
      .then(transpiled => {
        editorLoadingState.set(false)
        console.log(transpiled?.transpiledCode)
      })
      .finally(() => {
        editorLoadingState.set(false)
        this.running.set(false)
      })
  }

  public resetEditor() {
    this.editorRef.get().reset()
  }

  protected onWorkerError(type: ErrorType.Timeout | ErrorType.Worker, message: string): void {
    this.running.set(false)
    this.runFailed.set(true)
    if (type == ErrorType.Timeout) {
      displayMessage("Your code took too long to execute", "error", { single: true })
    } else if (message.includes("SyntaxError")) {
      displayMessage("Your code contains sytax errors", "error", { single: true })
    } else {
      displayMessage("An error occured", "info", { single: true })
    }
  }

  // todo make this work when using the playground transpiler backend
  protected async onUserCodeError(message: string, line: number, column: number) {
    this.running.set(false)
    this.runFailed.set(true)
    if (!this.transpileSourceMap || !this.preprocessSourceMap)
      return displayMessage("An error occured", "error", { single: true })

    const intermediateConsumer = new SourceMapConsumer(JSON.parse(this.transpileSourceMap))
    let intermediatePosition: MappedPosition | null = intermediateConsumer.originalPositionFor({
      line,
      column,
    })

    if (intermediatePosition?.source !== ORIGINAL_SOURCE_NAME)
      intermediatePosition = this.fallbackFindOriginalLine(intermediateConsumer, line, column)

    if (!intermediatePosition?.line)
      return displayMessage("An error occured", "error", { single: true })

    const originalPosition = new SourceMapConsumer(this.preprocessSourceMap).originalPositionFor({
      line: intermediatePosition.line,
      column: intermediatePosition.column,
    })
    if (!originalPosition.line) return displayMessage("An error occured", "error", { single: true })

    displayMessage(`An error occured in line ${originalPosition.line}`, "error", { single: true })
    this.editorRef.get().highlight(originalPosition.line, intermediatePosition.column)
    addLog([message, `at ${originalPosition.line}:${intermediatePosition.column}`], "error")
  }

  private fallbackFindOriginalLine(
    consumer: SourceMapConsumer,
    findLine: number,
    findColumn: number
  ): MappedPosition | null {
    let candidate: MappingItem | null = null
    consumer.eachMapping(mapping => {
      if (mapping.generatedLine < findLine - FALLBACK_FIND_ORIGINAL_MAX_DELTA) return
      if (mapping.generatedLine > findLine) return
      if (mapping.generatedLine == findLine && mapping.generatedColumn > findColumn) return
      if (mapping.source !== ORIGINAL_SOURCE_NAME) return
      candidate = mapping // use last candidate
    })
    let final = candidate as MappingItem | null
    return final
      ? { line: final.originalLine ?? 0, column: final.originalColumn ?? 0, source: final.source! }
      : null
  }

  private onTranspilationError(transpiled: ResultDtoInterface | null, _originalCode: string) {
    try {
      this.running.set(false)
      editorLoadingState.set(false)
      this.runFailed.set(true)
      this.editorRef.get().clearHighlight()
      if (transpiled == null) throw new Error("No transpilation result")

      if (transpiled.status != TranspilationStatus.CompilationError) {
        displayMessage("An error occurred", "error", { single: true })
        console.error(transpiled.status, transpiled)
      }

      const lines = this.findCompilerErrorLines(transpiled)

      if (typeof lines === "number") {
        displayMessage(`Please check line ${lines}`, "error", { single: true })
        addLog([transpiled.message], "error")
        return
      }

      if (Array.isArray(lines) && lines.length > 0) {
        if (!this.preprocessSourceMap) throw new Error("No preprocess source map available")
        const preprocessConsumer = new SourceMapConsumer(this.preprocessSourceMap)
        for (const el of lines) {
          const originalPosition = preprocessConsumer.originalPositionFor({
            line: el.line + 1,
            column: el.ch,
          })
          addLog([`${originalPosition.line}:${el.ch} - ${el.message}`], "error")
          this.editorRef.get().highlight(
            originalPosition.line,
            el.ch // columns are not modified by preprocessing
          )
        }
        if (lines.length === 1) {
          const prefix = lines[0].message.includes(": ") ? lines[0].message.split(": ")[0] + " in line" : "Please check line"
          displayMessage(
            `${prefix} ${preprocessConsumer.originalPositionFor({ line: lines[0].line + 1, column: lines[0].ch }).line}`,
            "error",
            { single: true }
          )
        } else {
          displayMessage("Please check the highlighted lines", "error", { single: true })
        }
        return
      }

      displayMessage("Please check your code", "error", { single: true })
      console.error("Transpilation failed", transpiled)
    } catch (e) {
      displayMessage("An error occurred", "error", { single: true })
      console.error(e, transpiled)
    }
  }

  private findCompilerErrorLines(
    transpiled: ResultDtoInterface
  ): number | { line: number; ch: number; message: string }[] | null {
    if (transpiled.message) {
      const line = this.matchLineInTranspilationError(transpiled.message)
      if (line) return line
    }
    if (transpiled.transpilerHints && transpiled.transpilerHints.length > 0) {
      const errors = transpiled.transpilerHints.filter(h => h.severity === "ERROR")
      return errors.map(e => ({
        line: e.interval.start.line,
        ch: e.interval.start.ch,
        message: e.message,
      }))
    }
    return null
  }
}
