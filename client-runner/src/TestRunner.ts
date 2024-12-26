import type { Callbacks } from "./Callbacks"
import { Executor } from "./Executor"
import { ScriptFactory } from "./ScriptFactory"

type Args = any[]
export type Test = { description: string; function: (args: Args, result: any) => boolean | string }
export type TestSet = { args: Args[]; run: { [id: string]: Test } }
export type TestSuite = TestSet[]

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
  testSuite: TestSuite

  constructor(testSuite: TestSuite) {
    this.testSuite = testSuite
  }

  execute(userCode: string, config: ExecutionConfig) {
    const script = this.buildScript(userCode, config)
    const executor = new Executor()
    return executor.execute(script, config.timeout, config.callbacks, this.onResult.bind(this))
  }

  private onResult(args: Args, result: any) {
    const sets = this.getTestsForArgs(args)

    sets.forEach(set => {
      Object.entries(set.run).forEach(([id, test]) => {
        const testResult = test.function(args, result)
        console.log(
          `Test ${id}('${test.description}'): ${testResult === true ? "Passed" : testResult || "Failed"}`
        )
      })
    })
  }

  private getTestsForArgs(args: Args) {
    return this.testSuite.filter(set =>
      set.args.some(
        argSet =>
          argSet.length === args.length && argSet.every((value, index) => value === args[index])
      )
    )
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
