import { Callbacks } from "./Callbacks"

export enum ErrorType {
  Timeout = "timeout",
  Logged = "logged",
  Worker = "worker",
}

export class Executor {
  constructor() {}

  async execute(
    script: string,
    timeoutMs: number,
    callbacks?: Callbacks,
    onResult?: (args: any[], result: any) => void,
    onError?: (type: ErrorType, error: Error | ErrorEvent) => void,
    onLog?: (args: any[]) => void
  ) {
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
            onResult?.(data.args, data.result)
            break
          case "error":
            onError?.(ErrorType.Logged, new Error(data.message))
            break
          case "log":
            onLog?.(data.args)
            break
          default:
            callbacks?.onWorkerMessage(event)
        }
      }

      worker.onerror = error => {
        onError?.(ErrorType.Worker, error)
        reject(
          new Error(
            `Fatal error in worker: ${error.message}, lineno: ${error.lineno}:${error.colno}`
          )
        )
      }
    })

    const lifeTimer = new Promise((_, reject) => {
      setTimeout(() => {
        onError?.(ErrorType.Timeout, new Error("Execution timed out"))
        reject(new Error("Execution timed out"))
      }, timeoutMs)
    })

    try {
      return await Promise.race([executionPromise, lifeTimer])
    } finally {
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
    }
  }
}
