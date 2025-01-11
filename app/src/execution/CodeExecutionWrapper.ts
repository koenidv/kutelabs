import { ErrorType } from "@kutelabs/client-runner/src/Executor"
import type { Atom } from "nanostores"
import type { EditorCodeInterface } from "../components/EditorCodeWrapper.svelte"
import { clearMessages, displayMessage, editorLoadingState, editorRef } from "../state/state"
import { BaseExecutionWrapper } from "./BaseExecutionWrapper"
import { transpileKtJs } from "./transpile"
import { TranspilationStatus } from "@kutelabs/server/src/transpile/TranspilationStatus"
import { Callbacks } from "@kutelabs/client-runner/src/Callbacks"
import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"

export class CodeExecutionWrapper extends BaseExecutionWrapper {
  editorRef = editorRef as Atom<EditorCodeInterface>

  public run(): void {
    const editor = this.editorRef.get()
    this.runFailed.set(false)
    displayMessage("Processing", "info", { duration: -1, single: true })
    editorLoadingState.set(true)

    transpileKtJs(editor.code()) // todo kotlin code has to be preprocessed to include DCE annotations
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

  protected onUserCodeError(message: string, line: number, column: number): void {
    console.error("User code error", message, `${line}:${column}`)
    displayMessage(`An error occured in line ${line}`, "error", { single: true }) // todo get the kotlin code line number from sourcemap
  }

  private onTranspilationError(transpiled: ResultDtoInterface | null, _originalCode: string) {
    try {
      this.running.set(false)
      editorLoadingState.set(false)
      if (transpiled == null || !transpiled.message) throw new Error("No transpilation message")
      // const line = this.matchLineInTranspilationError(transpiled.message)

      // todo (1) generate sourcemap on server, (2) use it to highlight the error
      displayMessage("Transpilation failed", "error", { single: true })
      this.runFailed.set(true)
      console.error("Transpilation failed", transpiled)
    } catch {
      displayMessage("Transpilation failed", "error", { single: true })
      this.runFailed.set(true)
      console.error("Transpilation failed", transpiled)
    }
  }
}
