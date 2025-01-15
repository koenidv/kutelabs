import type { CallbackCollection } from "./callbacks/CallbackCollection"
import { Timeout } from "./Timeout"

export enum ErrorType {
  Timeout = "timeout",
  Execution = "execution",
  Worker = "worker",
}

export type ExecutionError = {
  message: string
  stack: string
}

export type LogType = "log" | "error" | "warn"

export class Executor {
  onResult?: (args: any[], result: any) => void
  onError?: (type: ErrorType, error: ErrorEvent | ExecutionError) => void
  onCompleted?: () => void
  onRequestWait: (resolve: () => void) => void = resolve => resolve()

  private timeout = new Timeout()
  public pauseTimeout = () => this.timeout.pause()
  public resumeTimeout = () => this.timeout.resume()

  public cancel: (() => void) | null = null

  constructor(
    onResult?: (args: any[], result: any) => void,
    onError?: (type: ErrorType, error: ErrorEvent | ExecutionError) => void,
    onCompleted?: () => void,
    onRequestWait?: (resolve: () => void) => void
  ) {
    this.onResult = onResult
    this.onError = onError
    this.onCompleted = onCompleted
    if (onRequestWait) this.onRequestWait = onRequestWait
  }

  async execute(script: string, timeoutMs: number, callbacks?: CallbackCollection): Promise<unknown> {
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
            resolve(data)
            break
          case "result":
            this.onResult?.(data.args, data.result)
            break
          case "error":
            this.onError?.(ErrorType.Execution, data as ExecutionError)
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
      this.timeout.start(timeoutMs).then(() => {
        if (running) this.onError?.(ErrorType.Timeout, new ErrorEvent("Execution timed out"))
        reject(new Error("Execution timed out"))
      })
    })

    const cancelPromise = new Promise<void>(resolve => (this.cancel = resolve))

    try {
      return await Promise.race([executionPromise, lifeTimer, cancelPromise])
    } finally {
      running = false
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
      this.onCompleted?.()
      this.cancel = null
      this.timeout.reset()
    }
  }
}
