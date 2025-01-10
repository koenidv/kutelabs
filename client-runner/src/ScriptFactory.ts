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
    return this.buildGlobals().addCompletionMessage().sortSteps().enableAwait().joinSteps()
  }

  private buildGlobals(): this {
    const objectStringBuilder: string[] = []
    for (const [key, value] of this.globals) {
      objectStringBuilder.push(`${key}:(${value.toString()})`)
    }
    this.steps.push({
      type: StepType.Define,
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

  private enableAwait(): this {
    this.steps.unshift({ type: StepType.Disallow, step: "(async()=>{" })
    this.steps.push({ type: StepType.Execute, step: "})()" })
    return this
  }

  private joinSteps(): string {
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

  public addRejectedPromiseHandler(): this {
    this.steps.push({
      type: StepType.Define,
      step: `self.onunhandledrejection = (error) => { throw error.reason; };`,
    })
    return this
  }

  public addDelayApi(): this {
    this.steps.push({
      type: StepType.Define,
      step: `let waitRequestCount = 0;const waitRequests = new Map();`,
    })
    this.steps.push({
      type: StepType.Define,
      step: `self.onmessage=(e)=>{if(e.data.type=="resolveWait"){
      waitRequests.get(e.data.id)()
      waitRequests.delete(e.data.id)
      }};`,
    })
    this.globals.set(
      "requestWait",
      `()=>{let resolve;
      const promise=new Promise(it=>resolve=it);
      waitRequests.set(++waitRequestCount,resolve);
      postMessage({type:"requestWait",data:{id:waitRequestCount}});
      return promise;}`
    )
    return this
  }

  public addCallbacks(callbacks?: Callbacks): this {
    if (callbacks) {
      callbacks.proxies().forEach(proxy => {
        for (const [name, func] of Object.entries(proxy)) {
          this.globals.set(name, func)
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
    return this.addDefineStep(
      `/*__startUser*/const userFunction = new Function(
      ${argNames.length > 0 ? argNames.join(",") + "," : ""}
      String.raw\`
        const { ${[...this.globals.keys()].join(", ")} } = this;
        ${unsafeCode}
        return ${entrypoint}(${argNames.join(",")});
      \`/*__endUser*/);`
    )
  }

  public runCode(args: any[] = []): this {
    let argsList = args.map(arg => JSON.stringify(arg)).join(", ")
    return this.tryCatch(
      () => {
        this.addExecuteStep(
          `const result = await userFunction.call(globals${argsList.length > 0 ? ", " : ""}${argsList});`
        )
        this.addExecuteStep(
          `postMessage({ type: "result", data: { args: [${argsList}], result: result } });`
        )
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
         console.log(error);
          postMessage({ 
            type: 'error', 
            data: {...${JSON.stringify(data)}, "message": error.message, "stack": error.stack, "line": error.lineNumber, "column": error.columnNumber }
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
