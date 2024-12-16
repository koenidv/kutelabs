import { Callbacks } from "./Callbacks"
import { ScriptFactory } from "./ScriptFactory"

export class Runner {
  constructor() {}

  async execute(code: string, timeout = 1000) {
    const script = new ScriptFactory()
      .disallowGlobals(["window", "document", "localStorage", "fetch"])
      .allowApis(["Math"])
      .addCallbacks(new Callbacks())
      .addConsoleApi()
      .addCode(code)
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
          case "success":
            console.log("Worker success:", data)
            resolve(data)
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
      }, timeout)
    })

    try {
      return await Promise.race([executionPromise, lifeTimer])
    } finally {
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
    }
  }
}
