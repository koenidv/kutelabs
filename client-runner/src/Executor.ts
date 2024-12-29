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

export type LogType = "log" | "error" | "warn"

export class Executor {
  onResult?: (args: any[], result: any) => void
  onError?: (type: ErrorType, error: ErrorEvent | LoggedError) => void
  onLog?: (args: any[], type: LogType) => void
  onCompleted?: () => void
  onRequestWait: (resolve: () => void) => void = resolve => resolve()

  constructor(
    onResult?: (args: any[], result: any) => void,
    onError?: (type: ErrorType, error: ErrorEvent | LoggedError) => void,
    onLog?: (args: any[], type: LogType) => void,
    onCompleted?: () => void,
    onRequestWait?: (resolve: () => void) => void
  ) {
    this.onResult = onResult
    this.onError = onError
    this.onLog = onLog
    this.onCompleted = onCompleted
    if (onRequestWait) this.onRequestWait = onRequestWait
  }

  async execute(script: string, timeoutMs: number, callbacks?: Callbacks): Promise<unknown> {
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
            this.onResult?.(data.args, data.result)
            break
          case "error":
            this.onError?.(ErrorType.Execution, data as LoggedError)
            break
          case "log":
            this.onLog?.(Object.values(data), "log")
            break
          case "requestWait":
            this.onRequestWait(() => {
              worker.postMessage({ type: "resolveWait", id: data.id })
            })
            break
          default:
            callbacks?.onWorkerMessage(event)
        }
      }

      worker.onerror = error => {
        running = false
        this.onError?.(ErrorType.Worker, error)
        reject(
          new Error(
            `Worker execution failed at ${error.lineno}:${error.colno} with message "${error.message}".`
          )
        )
      }
    })

    const lifeTimer = new Promise((_, reject) => {
      setTimeout(() => {
        if (running) this.onError?.(ErrorType.Timeout, new ErrorEvent("Execution timed out"))
        reject(new Error("Execution timed out"))
      }, timeoutMs)
    })

    try {
      return await Promise.race([executionPromise, lifeTimer])
    } finally {
      running = false
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
      this.onCompleted?.()
    }
  }
}
