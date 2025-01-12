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
import { SourceMapConsumer } from "source-map-js"

export class CodeExecutionWrapper extends BaseExecutionWrapper {
  editorRef = editorRef as Atom<EditorCodeInterface>
  lastSourceMap: string | null = null

  public run(): void {
    const editor = this.editorRef.get()
    this.runFailed.set(false)
    displayMessage("Processing", "info", { duration: -1, single: true })
    editorLoadingState.set(true)

    transpileKtJs(editor.code(), false, true) // todo kotlin code has to be preprocessed to include DCE annotations
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
        this.runFailed.set(false)
        console.log(transpiled.transpiledCode)

        this.lastSourceMap = transpiled.sourceMap
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
    console.error("User code error", message, `transpiled:${line}:${column}`)
    if (!this.lastSourceMap) {
      displayMessage("An error occured", "error", { single: true })
      return
    }
    const consumer = new SourceMapConsumer(JSON.parse(this.lastSourceMap))
    console.log(consumer.sources)
    const originalPosition = consumer.originalPositionFor({ line, column })
    console.log(originalPosition)
    displayMessage(`An error occured in line ${originalPosition.line}`, "error", { single: true })
    addLog([message, `at ${originalPosition.line}:${originalPosition.column}`], "error")
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
