import type { Callbacks } from "./Callbacks"

enum StepType {
  Disallow,
  Allow,
  Execute,
}

type Step = { type: StepType; step: string }

export class ScriptFactory {
  private steps: Step[] = []
  private globals: Map<string, string> = new Map()

  constructor() {}

  public build(): string {
    return this.buildGlobals().sortSteps().joinSteps()
  }

  private buildGlobals(): this {
    const objectStringBuilder: string[] = []
    for (const [key, value] of this.globals) {
      objectStringBuilder.push(`${key}:(${value.toString()})`)
    }
    this.steps.push({
      type: StepType.Allow,
      step: `const globals = {${objectStringBuilder.join(",")}};`,
    })
    return this
  }

  private sortSteps(): this {
    this.steps.sort((a, b) => a.type - b.type)
    return this
  }

  private joinSteps(): string {
    console.log(
      "built script:\n",
      this.steps.reduce((acc, curr) => acc + curr.step + "\n", "")
    )
    return this.steps.reduce((acc, curr) => acc + curr.step, "")
  }

  public disallowGlobals(disallowedGlobals: string[]): this {
    disallowedGlobals.forEach(global => {
      this.steps.push({ type: StepType.Disallow, step: `self.${global} = undefined;` })
    }, this)
    return this
  }

  public allowApis(allowedApis: string[]): this {
    allowedApis.forEach(api => {
      this.globals.set(
        api,
        `(typeof self.${api} === 'function' || typeof self.${api} === 'object') ? self.${api} : undefined`
      )
    }, this)
    return this
  }

  public addCallbacks(callbacks: Callbacks): this {
    callbacks.proxies().forEach(proxy => {
      for (const [name, func] of Object.entries(proxy)) {
        this.globals.set(name, func.toString())
      }
    }, this)
    return this
  }

  public addConsoleApi(logType = "log", errorType = "error"): this {
    this.globals.set(
      "console",
      `{
        log: (...args) => {
          postMessage({ type: "${logType}", data: args })
        },
        error: (...args) => {
          postMessage({ type: "${errorType}", data: args })
        },
      }`
    )
    return this
  }

  public addCode(unsafeCode: string): this {
    return this.tryCatch(() => {
      this.addExecuteStep(`
          const userFunction = new Function(
          \`
            const { ${[...this.globals.keys()].join(", ")} } = this;
            ${unsafeCode}
          \`
          );`)
      this.addExecuteStep(`const result = userFunction.call(globals);`)
      this.addExecuteStep(`postMessage({ type: 'success', data: result });`)
    })
  }

  private tryCatch(addSteps: () => void): this {
    this.addExecuteStep("try {")
    addSteps()
    this.addExecuteStep(`
        } catch (error) {
          postMessage({ 
            type: 'error', 
            data: { 
              message: error.message,
              stack: error.stack 
            }
          });
        }`)
    return this
  }

  private addExecuteStep(step: string): this {
    this.steps.push({ type: StepType.Execute, step })
    return this
  }
}
