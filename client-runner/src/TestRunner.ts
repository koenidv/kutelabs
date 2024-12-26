import type { Callbacks } from "./Callbacks"
import { Executor } from "./Executor"
import { ScriptFactory } from "./ScriptFactory"

type Args = any[]
export type Test = { description: string; function: (args: Args, result: any) => boolean | string }
export type TestSet = { args: Args[]; run: { [id: string]: Test } }
export type TestSuite = TestSet[]
export type PivotTest = Test & { args: Args[] }
export type PivotTestSuite = { [id: string]: PivotTest }

export enum TestResult {
  Passed = "passed",
  Failed = "failed",
  Timeout = "timeout",
  Error = "error",
}

export type ExecutionConfig = {
  argNames: string[]
  entrypoint: string
  timeout: number
  disallowedGlobals?: string[]
  allowedApis?: string[]
  callbacks?: Callbacks
}

const DEFAULT_DISALLOWED_GLOBALS = ["window", "document", "localStorage", "fetch"]
const DEFAULT_ALLOWED_APIS = ["Math"]

export class TestRunner {
  private readonly testSuite: TestSuite
  private pivotTests: PivotTestSuite = {}

  private readonly onFinalTestResult: (id: string, result: TestResult, message?: string) => void

  constructor(testSuite: TestSuite, onResult: typeof this.onFinalTestResult) {
    this.testSuite = testSuite
    this.onFinalTestResult = onResult
  }

  execute(userCode: string, config: ExecutionConfig) {
    this.resetPivotTests()
    const script = this.buildScript(userCode, config)
    const executor = new Executor()
    return executor.execute(script, config.timeout, config.callbacks, this.onResult.bind(this))
  }

  private resetPivotTests() {
    this.pivotTests = this.testSuite.reduce((acc, set) => {
      Object.entries(set.run).forEach(([id, test]) => {
        acc[id] = { ...test, args: set.args }
      })
      return acc
    }, {} as PivotTestSuite)
  }

  private onResult(args: Args, result: any) {
    this.getTestsForArgs(args).forEach(test => this.runTest(test, args, result))
  }

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

  private runTest(test: PivotTest & { id: string }, args: Args, result: any) {
    try {
      const testResult = test.function(args, result)
      this.onTestResult(
        test.id,
        args,
        testResult === true ? TestResult.Passed : TestResult.Failed,
        typeof testResult === "string" ? testResult : undefined
      )
    } catch (error) {
      console.error(`Test ${test.id}('${test.description}') failed:`, error)
    }
  }

  private onTestResult(id: string, args: Args, passed: TestResult, message?: string) {
    this.pivotTests[id].args = this.pivotTests[id].args.filter(
      argSet =>
        argSet.length != args.length || !argSet.every((value, index) => value === args[index])
    )
    if (this.pivotTests[id].args.length === 0) {
      delete this.pivotTests[id]
      this.onFinalTestResult(id, passed, message)
    } else {
      console.log(`test ${id}(${args}): ${this.pivotTests[id].args.length} argsets remaining`)
    }
  }

  private buildScript(userCode: string, config: ExecutionConfig) {
    const factory = new ScriptFactory()
      .disallowGlobals(config.disallowedGlobals ?? DEFAULT_DISALLOWED_GLOBALS)
      .allowApis(config.allowedApis ?? DEFAULT_ALLOWED_APIS)
      .addCallbacks(config.callbacks)
      .addConsoleApi()
      .setCode(userCode, config.argNames, config.entrypoint)
    this.testSuite.forEach(
      testSet => testSet.args.forEach(args => factory.runCode(args), this),
      this
    )
    return factory.build()
  }
}
