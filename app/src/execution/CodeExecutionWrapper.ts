import { Callbacks } from "@kutelabs/client-runner/src/Callbacks"
import { ErrorType } from "@kutelabs/client-runner/src/Executor"
import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"
import { TranspilationStatus } from "@kutelabs/server/src/transpile/TranspilationStatus"
import type { Atom } from "nanostores"
import type { EditorCodeInterface } from "../components/EditorCodeWrapper.svelte"
import {
  addLog,
  clearMessages,
  displayMessage,
  editorLoadingState,
  editorRef,
} from "../state/state"
import { BaseExecutionWrapper } from "./BaseExecutionWrapper"
import { transpileKtJs } from "./transpile"
import { SourceMapConsumer, type RawSourceMap } from "source-map-js"
import { preprocessKotlin } from "./preprocessKotlin"

export class CodeExecutionWrapper extends BaseExecutionWrapper {
  editorRef = editorRef as Atom<EditorCodeInterface>
  preprocessSourceMap: RawSourceMap | null = null
  transpileSourceMap: string | null = null

  public run(): void {
    const editor = this.editorRef.get()
    this.runFailed.set(false)
    displayMessage("Processing", "info", { duration: -1, single: true })
    editorLoadingState.set(true)

    const preprocessed = preprocessKotlin(editor.code())
    this.preprocessSourceMap = preprocessed.sourceMap
    console.log(preprocessed.code)

    transpileKtJs(preprocessed.code, false, true)
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
          callbacks: new Callbacks(), // todo app features, these will also have to be defined before the kotlin code
          timeout: 1000,
        })
        this.running.set(true)
      })
      .catch(err => {
        console.error("Transpilation: Fetch failed", err)
        editorLoadingState.set(false)
        displayMessage("Please check your connection", "error", { single: true })
        this.runFailed.set(true)
        return
      })
  }

  public printKt() {
    console.log(this.editorRef.get().code())
  }

  public printJs() {
    editorLoadingState.set(true)
    transpileKtJs(this.editorRef.get().code())
      .then(transpiled => {
        editorLoadingState.set(false)
        console.log(transpiled?.transpiledCode)
      })
      .catch(e => {
        editorLoadingState.set(false)
        throw e
      })
  }

  protected onWorkerError(type: ErrorType.Timeout | ErrorType.Worker, message: string): void {
    if (type == ErrorType.Timeout) {
      displayMessage("Your code took too long to execute", "error", { single: true })
    } else if (message.includes("SyntaxError")) {
      displayMessage("Your code contains sytax errors", "error", { single: true })
    } else {
      displayMessage("An error occured", "info", { single: true })
    }
  }

  protected async onUserCodeError(message: string, line: number, column: number) {
    if (!this.transpileSourceMap || !this.preprocessSourceMap)
      return displayMessage("An error occured", "error", { single: true })

    const intermediatePosition = new SourceMapConsumer(
      JSON.parse(this.transpileSourceMap)
    ).originalPositionFor({ line, column })
    if (!intermediatePosition.line)
      return displayMessage("An error occured", "error", { single: true })

    const originalPosition = new SourceMapConsumer(this.preprocessSourceMap).originalPositionFor({
      line: intermediatePosition.line,
      column: intermediatePosition.column,
    })

    displayMessage(`An error occured in line ${originalPosition.line}`, "error", { single: true })
    this.editorRef.get().highlight(originalPosition.line, intermediatePosition.column)
    addLog([message, `at ${originalPosition.line}:${intermediatePosition.column}`], "error")
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
