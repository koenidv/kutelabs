import { ErrorType, type ExecutionError } from "@kutelabs/client-runner/src/Executor"
import { BlockMarking, EditorMixed, JsCompiler, KtCompiler } from "@kutelabs/editor-mixed"
import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"
import { TranspilationStatus } from "@kutelabs/server/src/routes/transpile/Status"
import { findBlockByLine } from "@kutelabs/shared/src"
import { persistentAtom } from "@nanostores/persistent"
import {
  addLog,
  clearMessages,
  displayMessage,
  editorLoadingState,
  editorRef,
} from "../state/state"
import { BaseExecutionWrapper } from "./BaseExecutionWrapper"
import { appFeatures, filterCallbacks } from "./EnvironmentContext"
import { transpileKtJs } from "./transpile"
import { validateJs } from "./validateJs"
import type { Atom } from "nanostores"

const executionDelay = {
  fast: 250,
  medium: 1000,
  slow: 2200,
}

export class MixedExecutionWrapper extends BaseExecutionWrapper {
  lastRunCode: string | null = null
  editorRef = editorRef as Atom<EditorMixed>

  public speed = persistentAtom<"fast" | "medium" | "slow">("execSpeed")
  public setSpeed = (speed: "fast" | "medium" | "slow") => {
    this.speed.set(speed)
    this.testRunner.setExecutionDelay(executionDelay[speed])
  }

  private getCallbacks(editor: EditorMixed) {
    const enabledCallbacks = ["markBlock", ...(this.environment.appFeatures ?? [])]
    return filterCallbacks(enabledCallbacks, {
      ...appFeatures,
      ...editor.getExecutionCallbacks(),
    })
  }

  /**
   * Run code depending on the environment language
   */
  public run() {
    switch (this.environment.language) {
      case "js":
        this.runJs()
        break
      case "kt":
        this.runKt()
        break
      default:
        if (this.editorRef.get().hasCustomCode()) this.runKt()
        else this.runJs()
    }
  }

  /**
   * Compile and run the code as JS
   */
  public runJs() {
    const editor = this.editorRef.get()
    editor.clearMarkings()
    this.runFailed.set(false)

    const callbacks = this.getCallbacks(editor)
    const compiled = editor.compile(JsCompiler, callbacks)
    if (!compiled) {
      displayMessage("Please add your code to a function block", "info", { single: true })
      return
    }
    this.running.set(true)

    const parsed = validateJs(compiled.code)
    if (!parsed.valid) {
      if (parsed.line) {
        const causingBlockId = findBlockByLine(compiled.code.split("\n"), parsed.line)
        if (causingBlockId) {
          this.onBlockError(
            [causingBlockId],
            "Error during code processing" + parsed.message ? ": " + parsed.message : "",
            "Please check the highlighted block."
          )
          return
        }
      }
      displayMessage("Please make sure your blocks are correct", "error", { single: true })
      return
    }
    this.lastRunCode = compiled.code

    this.testRunner
      .execute(compiled.code, {
        argNames: compiled.argNames,
        entrypoint: compiled.entrypoint,
        callbacks: callbacks,
        executionDelay: executionDelay[this.speed.get()],
        timeout: 1000,
      })
      ?.then(_result => {
        editor.onExecutionFinished()
      })
  }

  /**
   * Compile the code as Kt, transpile and run
   */
  public async runKt() {
    const editor = this.editorRef.get()
    editor.clearMarkings()
    this.runFailed.set(false)

    const callbacks = this.getCallbacks(editor)
    const compiled = editor.compile(KtCompiler, callbacks)
    displayMessage("Processing", "info", { duration: -1, single: true })
    if (!compiled) {
      displayMessage("Please add your code to a function block", "info", { single: true })
      return
    }
    this.running.set(true)
    editorLoadingState.set(true)

    transpileKtJs(this.abortController, compiled.code, compiled.entrypoint)
      .then(transpiled => {
        if (
          transpiled === null ||
          transpiled.status != TranspilationStatus.Success ||
          !transpiled.transpiledCode
        ) {
          return this.onTranspilationError(transpiled, compiled.code)
        }
        editorLoadingState.set(false)
        clearMessages()
        this.lastRunCode = transpiled.transpiledCode

        this.testRunner
          .execute(transpiled.transpiledCode, {
            argNames: compiled.argNames,
            entrypoint: transpiled.entrypoint ?? `transpiled.${compiled.entrypoint}`,
            callbacks: callbacks,
            executionDelay: executionDelay[this.speed.get()],
            timeout: 1000,
          })
          ?.then(_result => {
            editor.onExecutionFinished()
          })
      })
      .catch(err => {
        editorLoadingState.set(false)
        this.running.set(false)
        this.runFailed.set(true)
        clearMessages()
        if (err == "Execution stopped") return
        if (err.message.includes("Unauthorized")) {
          displayMessage("Please sign in", "error", { single: true })
        } else {
          displayMessage("Transpilation currently unavailable", "error", { single: true })
        }
        console.error("Transpilation: Fetch failed", err)
        return
      })
  }

  public printJs() {
    const editor = this.editorRef.get()
    const compiled = editor.compile(JsCompiler, this.getCallbacks(editor))
    console.log(compiled?.code)
  }

  public printKt() {
    const editor = this.editorRef.get()
    const compiled = editor.compile(KtCompiler, this.getCallbacks(editor))
    console.log(compiled?.code)
  }

  protected onWorkerError(type: ErrorType.Timeout | ErrorType.Worker, message: string) {
    this.running.set(false)
    this.runFailed.set(true)
    if (type == ErrorType.Timeout) {
      displayMessage("Timeout. Did you create an infinite loop?", "error", { single: true })
    } else if (message.includes("SyntaxError")) {
      displayMessage("Please make sure your blocks are correct", "error", { single: true })
    } else {
      displayMessage("An error occured", "info", { single: true })
    }
  }

  protected onUserCodeError(err: ExecutionError, line: number, _column: number) {
    this.running.set(false)
    this.runFailed.set(true)
    const editor = editorRef.get()
    if (!editor || !this.lastRunCode) throw new Error("Editor not found")
    const causingBlockId = findBlockByLine(this.lastRunCode.split("\n"), line)
    if (!causingBlockId) throw new Error("No block id found")
    this.onBlockError([causingBlockId], err.message)
  }

  private onTranspilationError(transpiled: ResultDtoInterface | null, originalCode: string) {
    try {
      this.running.set(false)
      editorLoadingState.set(false)
      if (!transpiled) throw new Error("No transpilation result")
      const lines = this.findCompilerErrorLines(transpiled)
      if (!lines || lines.length === 0) {
        throw new Error("No error lines found in transpilation result")
      }
      const editor = editorRef.get()
      if (!editor) throw new Error("Editor not found")

      const causingBlockIds = lines
        .map(it => findBlockByLine(originalCode.split("\n"), it))
        .filter(it => {
          if (it === null || it === undefined) {
            console.error("Could not find block for line", it, "in code", originalCode)
            return false
          }
          return true
        }) as string[]

      this.onBlockError(causingBlockIds, this.constructErrorDisplayMessage(transpiled, lines))
    } catch (e) {
      displayMessage("Transpilation failed", "error", { single: true })
      this.runFailed.set(true)
      console.error(e, transpiled)
    }
  }

  private findCompilerErrorLines(transpiled: ResultDtoInterface): number[] | null {
    if (transpiled.message) {
      const line = this.matchLineInTranspilationError(transpiled.message)
      if (line) return [line]
    }
    if (transpiled.transpilerHints && transpiled.transpilerHints.length > 0) {
      const errors = transpiled.transpilerHints.filter(h => h.severity === "ERROR")
      return errors.map(e => e.interval.start.line)
    }
    return null
  }

  private constructErrorDisplayMessage(
    transpiled: ResultDtoInterface,
    lines: number[] | null
  ): string {
    if (!lines || lines.length == 0) return "Something's wrong with your code."
    if (lines.length > 1) return `Please check the highlighted blocks.`
    if (transpiled.message && transpiled.message.includes("error: ")) {
      return `An error occurred: ${transpiled.message.split("error: ")[1]}. Please check the highlighted block.`
    }
    if (transpiled.message) {
      return `An error occurred: ${transpiled.message}. Please check the highlighted block.`
    }
    return "Please check the highlighted block."
  }

  private onBlockError(ids: string[], message: string, display: string | undefined = message) {
    addLog([message], "error")
    this.runFailed.set(true)
    this.running.set(false)
    if (display) displayMessage(display, "error", { single: true })
    if (!editorRef.get()) throw new Error("Editor not found")
    ids.forEach(id => {
      console.error("Error from test runner for block", id, message)
      this.editorRef.get().getExecutionCallbacks()["markBlock"]!(id, BlockMarking.Error)
    }, this)
  }
}
