import { SandboxTestRunner, type TestSuite } from "@kutelabs/client-runner"
import { addLog, clearMessages, displayMessage, editorRef, setTestResult } from "../state/state"
import { BlockMarking, EditorMixed, JsCompiler, KtCompiler } from "@kutelabs/editor-mixed"
import type { Challenge } from "../schema/challenge"
import { persistentAtom } from "@nanostores/persistent"
import { transpileKtJs } from "./transpile"
import { TranspilationStatus } from "@kutelabs/server/src/transpile/TranspilationStatus"
import { appFeatures, filterCallbacks } from "./EnvironmentContext"

const executionDelay = {
  fast: 250,
  medium: 1000,
  slow: 2200,
}

export class ExecutionWrapper {
  testRunner: SandboxTestRunner
  environment: Challenge["environment"]

  constructor(tests: Challenge["tests"], environment: Challenge["environment"]) {
    this.testRunner = new SandboxTestRunner(
      this.parseTests(tests),
      setTestResult,
      addLog,
      (type, message) => {
        addLog([message], "error")
        console.error("General error from test runner", type, message)
      },
      (id, message) => {
        addLog([message], "error")
        console.error("Error from test runner for block", id, message)
        if (!editorRef.get()) throw new Error("Editor not found")
        editorRef.get()!.getExecutionCallbacks()["markBlock"]!(id, BlockMarking.Error)
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
        timeout: 5000,
      })
      ?.then(_result => {
        editor.onExecutionFinished()
      })
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

    const transpiled = await transpileKtJs(compiled.code)
    if (
      transpiled === null ||
      transpiled.status != TranspilationStatus.Success ||
      !transpiled.transpiledCode
    ) {
      displayMessage("Transpilation failed", "error", { single: true })
      throw new Error("Transpilation failed")
    }
    clearMessages()

    this.testRunner
      .execute(transpiled.transpiledCode, {
        argNames: compiled.argNames,
        entrypoint: `transpiled.${compiled.entrypoint}`,
        callbacks: callbacks,
        executionDelay: executionDelay[this.speed.get()],
        timeout: 5000,
      })
      ?.then(_result => {
        editor.onExecutionFinished()
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
}
