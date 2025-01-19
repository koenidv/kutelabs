import type { CallbackCollection } from "./callbacks/CallbackCollection"
import type { NestedStrings } from "./types/nested.types"
import { stringifyNestedStrings } from "./utils/util"

enum StepType {
  Disallow,
  Allow,
  Define,
  Execute,
}

type Step = { type: StepType; step: string }

export class ScriptFactory {
  private steps: Step[] = []
  private globals: NestedStrings = {}

  constructor() {}

  public build(): string {
    return this.buildGlobals().addCompletionMessage().sortSteps().enableAwait().joinSteps()
  }

  private buildGlobals(): this {
    this.steps.push({
      type: StepType.Define,
      step: `const globals = ${stringifyNestedStrings(this.globals)};`,
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
      this.globals[api] =
        `(typeof self.${api} === 'function' || typeof self.${api} === 'object') ? self.${api} : undefined`
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
    this.globals["requestWait"] =
      '()=>{let resolve; \
      const promise=new Promise(it=>resolve=it); \
      waitRequests.set(++waitRequestCount,resolve); \
      postMessage({type:"requestWait",data:{id:waitRequestCount}}); \
      return promise;}'
    return this
  }

  public addCallbacks(callbacks?: CallbackCollection): this {
    const proxies = callbacks?.proxies()
    if (proxies) this.globals = { ...this.globals, ...proxies }
    return this
  }

  public setCode(unsafeCode: string, argNames: string[] = [], entrypoint = "main"): this {
    return this.addDefineStep(
      `/*__startUser*/const userFunction = new Function(
${argNames.length > 0 ? argNames.join(",") + "," : ""}
String.raw\`
const { ${Object.keys(this.globals).join(", ")} } = this;
${unsafeCode.replaceAll(/`/g, "\\`")}
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
