import type { Callbacks } from "./Callbacks"

enum StepType {
  Disallow,
  Allow,
  Define,
  Execute,
}

type Step = { type: StepType; step: string }

export class ScriptFactory {
  private steps: Step[] = []
  private globals: Map<string, string> = new Map()

  constructor() {}

  public build(): string {
    return this.buildGlobals().addCompletionMessage().sortSteps().joinSteps()
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

  private addCompletionMessage(): this {
    this.addExecuteStep(`postMessage({ type: "completed", data: {} });`)
    return this
  }

  private sortSteps(): this {
    this.steps.sort((a, b) => a.type - b.type)
    return this
  }

  private joinSteps(): string {
    console.log(
      "built script:\n",
      this.steps.reduce((acc, curr) => acc + curr.step, "")
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

  public addCallbacks(callbacks?: Callbacks): this {
    if (callbacks) {
      callbacks.proxies().forEach(proxy => {
        for (const [name, func] of Object.entries(proxy)) {
          this.globals.set(name, func.toString())
        }
      }, this)
    }
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

  public setCode(unsafeCode: string, argNames: string[] = [], entrypoint = "main"): this {
    return this.tryCatch(() => {
      this.addDefineStep(`
          const userFunction = new Function(
          ${argNames.length > 0 ? argNames.join(",") + "," : ""}
          \`
            const { ${[...this.globals.keys()].join(", ")} } = this;
            ${unsafeCode}
            return ${entrypoint}(${argNames.join(",")});
          \`
          );`)
    })
  }

  public runCode(args: any[] = []): this {
    let argsList = args.map(arg => JSON.stringify(arg)).join(", ")
    if (argsList.length > 0) argsList = `, ${argsList}`
    return this.tryCatch(
      () => {
        this.addExecuteStep(`const result = userFunction.call(globals${argsList});`)
        this.addExecuteStep(`postMessage({ type: "result", data: result });`)
      },
      StepType.Execute,
      { args: args }
    )
  }

  private tryCatch(
    addSteps: () => void,
    type: StepType = StepType.Execute,
    data: { [key: string]: any } = {}
  ): this {
    this.steps.push({ type, step: "try {" })
    addSteps()
    this.steps.push({
      type,
      step: `
        } catch (error) {
          postMessage({ 
            type: 'error', 
            data: {...${JSON.stringify(data)}, "message": error.message, "stack": error.stack }
          });
        }`,
    })
    return this
  }

  private addDefineStep(step: string): this {
    this.steps.push({ type: StepType.Define, step })
    return this
  }

  private addExecuteStep(step: string): this {
    this.steps.push({ type: StepType.Execute, step })
    return this
  }
}
