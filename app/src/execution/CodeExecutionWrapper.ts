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

    const preprocessed = preprocessKotlin(code)
    this.preprocessSourceMap = preprocessed.sourceMap

    transpileKtJs(this.abortController, preprocessed.code, false, true)
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

        this.transpileSourceMap = transpiled.sourceMap
        this.testRunner.execute(transpiled.transpiledCode, {
          argNames: editor.argnames(),
          entrypoint: `transpiled.${editor.entrypoint()}`,
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
    transpileKtJs(this.abortController, this.editorRef.get().code() ?? "")
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
      if (transpiled == null || !transpiled.message) throw new Error("No transpilation message")

      if (transpiled.status == TranspilationStatus.CompilationError) {
        const line = this.matchLineInTranspilationError(transpiled.message)
        displayMessage(`Please check line ${line}`, "error", { single: true })
        addLog([transpiled.message], "error")
        return
      }

      // todo (1) generate sourcemap on server, (2) use it to highlight the error
      displayMessage("Transpilation failed", "error", { single: true })
      console.error("Transpilation failed", transpiled)
    } catch {
      displayMessage("Transpilation failed", "error", { single: true })
      console.error("Transpilation failed", transpiled)
    }
  }
}
