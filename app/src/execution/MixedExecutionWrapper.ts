import { SandboxTestRunner, type TestSuite } from "@kutelabs/client-runner"
import {
  addLog,
  clearMessages,
  displayMessage,
  editorLoadingState,
  editorRef,
  setTestResult,
} from "../state/state"
import { BlockMarking, EditorMixed, JsCompiler, KtCompiler } from "@kutelabs/editor-mixed"
import type { Challenge } from "../schema/challenge"
import { persistentAtom } from "@nanostores/persistent"
import { transpileKtJs } from "./transpile"
import { TranspilationStatus } from "@kutelabs/server/src/transpile/TranspilationStatus"
import { appFeatures, filterCallbacks } from "./EnvironmentContext"
import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"
import { findBlockByLine } from "@kutelabs/shared/src"
import { atom } from "nanostores"
import { ErrorType } from "@kutelabs/client-runner/src/Executor"

const executionDelay = {
  fast: 250,
  medium: 1000,
  slow: 2200,
}

export class ExecutionWrapper {
  private testRunner: SandboxTestRunner
  private environment: Challenge["environment"]

  public running = atom(false)

  constructor(tests: Challenge["tests"], environment: Challenge["environment"]) {
    this.testRunner = new SandboxTestRunner(
      this.parseTests(tests),
      setTestResult,
      addLog,
      (type, message) => {
        this.running.set(false)
        addLog([message], "error")
        if (type == ErrorType.Timeout) {
          displayMessage("Timeout. Did you create an infinite loop?", "error", { single: true })
        } else if (message.includes("SyntaxError")) {
          displayMessage("Please make sure your blocks are correct", "error", { single: true })
        } else {
          displayMessage("An error occured", "info", { duration: -1, single: true })
        }
      },
      this.onBlockError.bind(this),
      () => {
        this.running.set(false)
      }
    )
    this.environment = environment
  }

  private parseTests(rawTests: Challenge["tests"]): TestSuite {
    return (rawTests ?? []).map(set => {
      return {
        ...set,
        run: Object.fromEntries(
          Object.entries(set.run).map(([id, test]) => {
            return [
              id,
              {
                ...test,
                function: eval(test.function),
              },
            ]
          })
        ),
      }
    }) as unknown as TestSuite
  }

  public speed = persistentAtom<"fast" | "medium" | "slow">("execSpeed")
  public setSpeed = (speed: "fast" | "medium" | "slow") => {
    this.speed.set(speed)
    this.testRunner.setExecutionDelay(executionDelay[speed])
  }

  private getCallbacks(editor: EditorMixed) {
    return filterCallbacks(this.environment.appFeatures ?? [], {
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
        throw new Error(`Unsupported language ${this.environment.language}`)
    }
  }

  /**
   * Compile and run the code as JS
   */
  public runJs() {
    const editor = editorRef.get()
    if (!editor) throw new Error("Editor not found")
    editor.clearMarkings()

    const callbacks = this.getCallbacks(editor)
    const compiled = editor.compile(JsCompiler, callbacks)
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
    this.running.set(true)
  }

  /**
   * Compile the code as Kt, transpile and run
   */
  public async runKt() {
    const editor = editorRef.get()
    if (!editor) throw new Error("Editor not found")
    editor.clearMarkings()

    const callbacks = this.getCallbacks(editor)
    const compiled = editor.compile(KtCompiler, callbacks)
    displayMessage("Processing", "info", { duration: -1, single: true })
    editorLoadingState.set(true)

    transpileKtJs(compiled.code)
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

        this.testRunner
          .execute(transpiled.transpiledCode, {
            argNames: compiled.argNames,
            entrypoint: `transpiled.${compiled.entrypoint}`,
            callbacks: callbacks,
            executionDelay: executionDelay[this.speed.get()],
            timeout: 1000,
          })
          ?.then(_result => {
            editor.onExecutionFinished()
          })
        this.running.set(true)
      })
      .catch(err => {
        console.error("Transpilation: Fetch failed", err)
        editorLoadingState.set(false)
        displayMessage("Please check your connection", "error", { single: true })
        return
      })
  }

  public printJs() {
    const editor = editorRef.get()
    if (!editor) throw new Error("Editor not found")
    const compiled = editor.compile(JsCompiler, this.getCallbacks(editor))
    console.log(compiled.code)
  }

  public printKt() {
    const editor = editorRef.get()
    if (!editor) throw new Error("Editor not found")
    const compiled = editor.compile(KtCompiler, this.getCallbacks(editor))
    console.log(compiled.code)
  }

  public stop() {
    // todo stop executor
    console.error("Stopping execution is not yet implemented")
  }

  private onTranspilationError(transpiled: ResultDtoInterface | null, originalCode: string) {
    try {
      this.running.set(false)
      editorLoadingState.set(false)
      if (transpiled == null || !transpiled.message) throw new Error("No transpilation message")
      const editor = editorRef.get()
      if (!editor) throw new Error("Editor not found")

      const line = this.matchLineInTranspilationError(transpiled.message)
      const causingBlockId = findBlockByLine(originalCode.split("\n"), line!)
      if (!causingBlockId) throw new Error("No block id found")
      this.onBlockError(
        causingBlockId,
        "Error during code processing: " + transpiled.message.includes("error: ")
          ? transpiled.message.split("error: ")[1]
          : transpiled.message,
        "Please check the highlighted block."
      )
    } catch {
      displayMessage("Transpilation failed", "error", { single: true })
      console.error("Transpilation failed", transpiled)
    }
  }

  private matchLineInTranspilationError(error: string): number | null {
    const match = error.match(/code\.kt:(\d+)/)
    if (!match) return null
    return parseInt(match[1])
  }

  private onBlockError(id: string, message: string, display: string | undefined = message) {
    addLog([message], "error")
    if (display) displayMessage(display, "error", { single: true })
    console.error("Error from test runner for block", id, message)
    if (!editorRef.get()) throw new Error("Editor not found")
    editorRef.get()!.getExecutionCallbacks()["markBlock"]!(id, BlockMarking.Error)
  }
}
