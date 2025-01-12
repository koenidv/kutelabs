import { SandboxTestRunner, TestResult, type TestSuite } from "@kutelabs/client-runner"
import { ErrorType } from "@kutelabs/client-runner/src/Executor"
import { atom } from "nanostores"
import type { Challenge } from "../schema/challenge"
import { addLog, editorLoadingState, setTestResult } from "../state/state"

export abstract class BaseExecutionWrapper {
  protected readonly testRunner: SandboxTestRunner
  protected readonly environment: Challenge["environment"]

  protected readonly abortController = new AbortController()

  public running = atom(false)
  public runFailed = atom(false)
  public onSuccess = () => {}

  constructor(
    tests: Challenge["tests"],
    environment: Challenge["environment"],
    runner?: SandboxTestRunner
  ) {
    const testsParsed = this.parseTests(tests)
    this.testRunner =
      runner ??
      new SandboxTestRunner(
        testsParsed,
        (id, result) => {
          if (result != TestResult.Passed && result != TestResult.Pending) this.runFailed.set(true)
          setTestResult(id, result)
        },
        addLog,
        (type, message) => {
          this.running.set(false)
          addLog([message], "error")
          this.runFailed.set(true)
          this.onWorkerError(type, message)
        },
        this.onUserCodeError.bind(this),
        () => {
          this.running.set(false)
          if (!this.runFailed.get()) this.onSuccess()
        }
      )
    this.environment = environment
  }

  public abstract run(): void
  protected abstract onWorkerError(type: ErrorType.Timeout | ErrorType.Worker, error: string): void
  protected abstract onUserCodeError(message: string, line: number, column: number): void

  public stop() {
    this.abortController.abort("Execution stopped")
    this.running.set(false)
    editorLoadingState.set(false)
    this.runFailed.set(true)
    this.testRunner.cancel()
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

  protected matchLineInTranspilationError(error: string): number | null {
    const match = error.match(/code\.kt:(\d+)/)
    if (!match) return null
    return parseInt(match[1])
  }
}
