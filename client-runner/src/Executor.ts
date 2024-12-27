import { Callbacks } from "./Callbacks"

export enum ErrorType {
  Timeout = "timeout",
  Execution = "execution",
  Worker = "worker",
}

export type LoggedError = {
  message: string
  stack: string
}

export class Executor {
  constructor() {}

  async execute(
    script: string,
    timeoutMs: number,
    callbacks?: Callbacks,
    onResult?: (args: any[], result: any) => void,
    onError?: (type: ErrorType, error: ErrorEvent | LoggedError) => void,
    onLog?: (args: any[]) => void
  ): Promise<unknown> {
    let running = true
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
            console.log("completed exec")
            resolve(data)
            break
          case "result":
            onResult?.(data.args, data.result)
            break
          case "error":
            onError?.(ErrorType.Execution, data as LoggedError)
            break
          case "log":
            onLog?.(Object.values(data))
            break
          default:
            callbacks?.onWorkerMessage(event)
        }
      }

      worker.onerror = error => {
        running = false
        onError?.(ErrorType.Worker, error)
        reject(
          new Error(
            `Worker execution failed at ${error.lineno}:${error.colno} with message "${error.message}".`
          )
        )
      }
    })

    const lifeTimer = new Promise((_, reject) => {
      setTimeout(() => {
        if (running) onError?.(ErrorType.Timeout, new ErrorEvent("Execution timed out"))
        reject(new Error("Execution timed out"))
      }, timeoutMs)
    })

    try {
      return await Promise.race([executionPromise, lifeTimer])
    } finally {
      running = false
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
    }
  }
}
