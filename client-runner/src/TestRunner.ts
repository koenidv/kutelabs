import type { CallbackCollection } from "./callbacks/CallbackCollection"
import { ErrorType, Executor, type ExecutionError } from "./Executor"
import { ScriptFactory } from "./ScriptFactory"

type Args = any[]
export type Test = {
  description: string
  function: (props: {
    args: Args
    result: any
    callbacks: CallbackCollection
    executedCode: string
  }) => boolean | string
}
export type TestSet = { args: Args[]; run: { [id: string]: Test } }
export type TestSuite = TestSet[]
export type PivotTest = Test & { args: Args[] }
export type PivotTestSuite = { [id: string]: PivotTest }

export enum TestResult {
  Pending = "pending",
  Passed = "passed",
  Failed = "failed",
  Timeout = "timeout",
  Error = "error",
  None = "none",
}

export type ExecutionConfig = {
  argNames: string[]
  entrypoint: string
  timeout: number
  callbacks: CallbackCollection
  executionDelay?: number
  disallowedGlobals?: string[]
  allowedApis?: string[]
}

const DEFAULT_DISALLOWED_GLOBALS = ["window", "document", "localStorage", "fetch"]
const DEFAULT_ALLOWED_APIS = ["Math"]

export class TestRunner {
  private readonly testSuite: TestSuite
  /** Pivoted tests by test id instead of by args */
  private pivotTests: PivotTestSuite = {}

  private readonly onFinalTestResult: (id: string, result: TestResult, message?: string) => void
  private readonly onGeneralError: (
    type: Exclude<ErrorType, ErrorType.Execution>,
    message: string
  ) => void = console.error
  private readonly onUserCodeError: (message: string, line: number, column: number) => void =
    console.error
  private readonly onFinished: (() => void) | undefined

  private readonly executor: Executor

  private executionDelay = 0
  private firstCallFinished = false

  private currentUserCode: string | null = null
  private currentScript: string | null = null
  private currentCallbacks: CallbackCollection | null = null

  constructor(
    testSuite: TestSuite,
    onResult: typeof this.onFinalTestResult,
    onGeneralError?: typeof this.onGeneralError,
    onBlockError?: typeof this.onUserCodeError,
    onFinished?: () => void
  ) {
    this.testSuite = testSuite
    this.onFinalTestResult = onResult
    if (onGeneralError) this.onGeneralError = onGeneralError
    if (onBlockError) this.onUserCodeError = onBlockError
    if (onFinished) this.onFinished = onFinished

    this.executor = new Executor(
      this.onResult.bind(this),
      this.onError.bind(this),
      this.onExecutionCompleted.bind(this),
      this.onWaitRequest.bind(this)
    )
  }

  public setExecutionDelay(delay: number) {
    this.executionDelay = delay
  }

  /**
   * Executes the user code with the given configuration and runs the test suite on the results.
   * @param userCode user code to run
   * @param config configuration for the execution, defines allowed apis, argnames, entrypoint, etc.
   */
  execute(userCode: string, config: ExecutionConfig) {
    if (this.currentScript != null) {
      console.error("This TestRunner is already running a test suite")
      return
    }
    this.resetPivotTests()
    this.executionDelay = config.executionDelay ?? -1
    this.firstCallFinished = false
    this.currentUserCode = userCode
    this.currentScript = this.buildScript(userCode, config)
    this.currentCallbacks = config.callbacks

    return this.executor.execute(this.currentScript, config.timeout, config.callbacks)
  }

  /**
   * Cancels the execution of the user code and all tests.
   */
  cancel() {
    this.executor.cancel?.()
    this.failRemainingTests("Execution stopped", TestResult.None)
  }

  /**
   * Sets the pivot tests to the initial state, where all tests are pending.
   */
  private resetPivotTests() {
    this.pivotTests = this.testSuite.reduce((acc, set) => {
      Object.entries(set.run).forEach(([id, test]) => {
        acc[id] = { ...test, args: set.args }
        this.onFinalTestResult(id, TestResult.Pending)
      }, this)
      return acc
    }, {} as PivotTestSuite)
  }

  /**
   * Builds the worker script that will run the user code and executions required for the test suite
   * @param userCode user code to run
   * @param config configuration for the execution, defines allowed apis, argnames, entrypoint, etc.
   * @returns worker script to run
   */
  private buildScript(userCode: string, config: ExecutionConfig) {
    const factory = new ScriptFactory()
      .disallowGlobals(config.disallowedGlobals ?? DEFAULT_DISALLOWED_GLOBALS)
      .allowApis(config.allowedApis ?? DEFAULT_ALLOWED_APIS)
      .addRejectedPromiseHandler()
      .addDelayApi()
      .addCallbacks(config.callbacks)
      .setCode(userCode, config.argNames, config.entrypoint)
    this.testSuite.forEach(
      testSet => testSet.args.forEach(args => factory.runCode(args), this),
      this
    )
    return factory.build()
  }

  /**
   * Resolves wait requests from the executed code with a delay if this is the first call
   * @param resolve resolving function for the wait request
   */
  onWaitRequest(resolve: () => void) {
    this.executor.pauseTimeout()
    setTimeout(
      () => {
        this.executor.resumeTimeout()
        resolve()
      },
      this.firstCallFinished ? 0 : this.executionDelay
    )
  }

  /**
   * Called when an invokation of the user function has completed. The user function is called for each set of arguments defined in the test suite.
   * @param args Set of arguments the user function was called with
   * @param result Result of the user function
   */
  private onResult(args: Args, result: any): void {
    this.firstCallFinished = true
    if (Object.keys(this.pivotTests).length === 0) this.onFinished?.()
    if (!this.currentCallbacks) throw new Error("No callbacks set")
    this.getTestsForArgs(args).forEach(
      test => this.runTest(test, args, result, this.currentCallbacks!),
      this
    )
    this.currentCallbacks.resetCalls()
  }

  /**
   * Filters pivoted tests to find those that should be run on a result from the given set arguments
   * @param args Set of arguments that the user function has been run with
   * @returns list of tests to run
   */
  private getTestsForArgs(args: Args): (PivotTest & { id: string })[] {
    return Object.entries(this.pivotTests)
      .filter(([_id, test]) =>
        test.args.some(
          argSet =>
            argSet.length === args.length && argSet.every((value, index) => value === args[index])
        )
      )
      .map(([id, test]) => ({ ...test, id }))
  }

  /**
   * Runs a test on the result of the user function
   * @param test pivoted test to run
   * @param args arguments the user function was called with
   * @param result result of the user function
   */
  private runTest(
    test: PivotTest & { id: string },
    args: Args,
    result: any,
    callbacks: CallbackCollection
  ): void {
    try {
      const testResult = test.function({
        args,
        result,
        callbacks,
        executedCode: this.currentUserCode!,
      })
      if (testResult === true) {
        this.onTestResult(test.id, args, TestResult.Passed)
      } else {
        this.failRemainingTests(
          typeof testResult === "string" ? testResult : undefined,
          TestResult.Failed
        )
      }
    } catch (error) {
      console.error(`Test ${test.id}('${test.description}') failed:`, error)
      this.failRemainingTests(undefined, TestResult.Error)
    }
  }

  /**
   * Fails all still remaining tests. This is called when an error occurs or the execution times out.
   */
  private failRemainingTests(message?: string, result = TestResult.Failed) {
    Object.entries(this.pivotTests).forEach(([testId, _]) => {
      this.onFinalTestResult(testId, result, message)
    })
    this.onFinished?.()
  }

  /**
   * Called when a test has completed.
   * This updates the list of arguments remaining for the test and reports the result if there are no more arguments to run the test with.
   * @param id id of the test that was completed
   * @param args arguments the user function was run with for this test
   * @param passed result of the test *(not named result to avoid confusion with the result of the user function)*
   * @param message optional message from the test if it failed
   */
  private onTestResult(id: string, args: Args, passed: TestResult, message?: string) {
    this.pivotTests[id].args = this.pivotTests[id].args.filter(
      argSet =>
        argSet.length != args.length || !argSet.every((value, index) => value === args[index])
    )
    if (this.pivotTests[id].args.length === 0) {
      // fixme should fail remaining args of this test if test failed
      delete this.pivotTests[id]
      this.onFinalTestResult(id, passed, message)
      if (Object.keys(this.pivotTests).length === 0) this.onFinished?.()
    } else {
      console.log(`test ${id}(${args}): ${this.pivotTests[id].args.length} argsets remaining`)
    }
  }

  /**
   * Handles errors that occur during test execution.
   *
   * **Worker** type errors happened somewhere outside the user function - which also includes evaluating the user function - and commonly occur due to syntax errors in the user code.
   * Unfortunately, these errors will not provide the position in the user code (for syntax errors) at which they occurred, only the positon of the worker script command.
   *
   * **Execution** type errors occured during the execution of the user function and will provide the position in the user code at which they occurred in the stack trace.
   *
   * **Timeout** errors signal the worker script was not completed during the specified timeout.
   *
   * @param type type of the error (see above)
   * @param error the error that occured
   */
  private onError(type: ErrorType, error: ErrorEvent | ExecutionError) {
    if (type == ErrorType.Worker || type == ErrorType.Timeout) {
      this.failRemainingTests()
      this.onGeneralError(type, error.message)
      return
    }

    const execerr = error as ExecutionError
    const linecol = this.matchLineInStack(execerr.stack)
    if (!linecol) throw new Error(`Could not find line in stack: ${execerr.stack}`)
    linecol[0] -= this.findUserFunctionStartLine()
    this.failRemainingTests(execerr.message)
    this.onUserCodeError(execerr.message, ...linecol)
  }

  /**
   * Matches the line number in the stack trace of an error
   * @param stack stack trace of an error
   * @returns line number and column in the user code that caused the error, or undefined if not found
   */
  private matchLineInStack(stack: string): [number, number] | undefined {
    const linecol = stack.match(/<anonymous>:(\d+):(\d+)/)
    if (!linecol || linecol?.length < 2) return undefined
    return [parseInt(linecol[1]), parseInt(linecol[2])]
  }

  /**
   * Finds the index of the first user line in the worker script
   */
  private findUserFunctionStartLine(): number {
    // find __startUser line
    if (!this.currentScript) return 0
    const line = this.currentScript.split("\n").findIndex(line => line.includes("__startUser"))
    if (line === -1) {
      console.error("Could not find __startUser line in worker script")
      return 0
    }
    return line + 1
  }

  /**
   * Resets the execution state of the TestRunner.
   * Called when the execution of the user code has completed.
   */
  private onExecutionCompleted() {
    this.currentScript = null
  }
}
