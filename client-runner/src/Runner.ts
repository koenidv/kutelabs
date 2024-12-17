import { Callbacks } from "./Callbacks"
import { ScriptFactory } from "./ScriptFactory"

const DEFAULT_TIMEOUT = 1000
const DEFAULT_DISALLOWED_GLOBALS = ["window", "document", "localStorage", "fetch"]
const DEFAULT_ALLOWED_APIS = ["Math"]

export type ExecutionConfig = {
  timeout?: number,
  disallowedGlobals?: string[],
  allowedApis?: string[],
  callbacks?: Callbacks,
}

export class Runner {
  constructor() {}

  async execute(code: string, config: ExecutionConfig = {}) {
    const script = new ScriptFactory()
      .disallowGlobals(config.disallowedGlobals ?? DEFAULT_DISALLOWED_GLOBALS)
      .allowApis(config.allowedApis ?? DEFAULT_ALLOWED_APIS)
      .addCallbacks(config.callbacks)
      .addConsoleApi()
      .setCode(code)
      .runCode()
      .build()

    const workerUrl = URL.createObjectURL(
      new Blob([script], {
        type: "application/javascript",
      })
    )
    const worker = new Worker(workerUrl)

    const executionPromise = new Promise((resolve, reject) => {
      worker.onmessage = event => {
        const { type, data } = event.data
        switch (type) {
          case "completed":
            resolve(data)
            break
          case "result":
            console.log("Call yielded result:", data)
            break
          case "error":
            console.error("Worker error:", data)
            reject(new Error(data.message))
            break
          case "log":
            console.log("[Sandbox]", ...data)
            break
        }
      }

      worker.onerror = error => {
        reject(new Error(`Worker error: ${error.message}`))
      }
    })

    const lifeTimer = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Execution timed out"))
      }, config.timeout ?? DEFAULT_TIMEOUT)
    })

    try {
      return await Promise.race([executionPromise, lifeTimer])
    } finally {
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
    }
  }
}
