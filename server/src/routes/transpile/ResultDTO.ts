import { type TranspilationResult } from "../../transpile/transpile"
import { TranspilationStatus } from "../../transpile/TranspilationStatus"
import type { ResultDtoInterface } from "./ResultDtoInterface"
import { trimErrorMessage } from "../../transpile/transpileUtils"

export class ResultDTO implements ResultDtoInterface {
  status: TranspilationStatus
  transpiledCode: string | null
  message: string | null = null
  cached: boolean = false

  private constructor(
    status: TranspilationStatus,
    transpiledCode: string | null = null,
    message: string | null = null,
    cached: boolean = false
  ) {
    this.status = status
    this.transpiledCode = transpiledCode
    this.message = message
    this.cached = cached
  }

  public static error(status: TranspilationStatus, message: string | null = null) {
    return new ResultDTO(status, null, message)
  }

  public static fromTranspilationResult(result: TranspilationResult): ResultDTO {
    switch (result.status) {
      case TranspilationStatus.Success:
        return new ResultDTO(TranspilationStatus.Success, result.transpiled)
      case TranspilationStatus.CompilationError:
      case TranspilationStatus.Timeout:
        console.error("Compilation error", result.message)
        return ResultDTO.error(result.status, trimErrorMessage(result.message))
      default:
        console.error("Unknown error", result.message)
        return ResultDTO.error(
          TranspilationStatus.UnknownError,
          "An internal error occurred and our team has been notified."
        )
    }
  }

  public postProcess(process: (code: string) => string): this {
    if (this.transpiledCode != null) this.transpiledCode = process(this.transpiledCode!)
    return this
  }

  public setAsCached(): this {
    this.cached = true
    return this
  }

  public toString(): string {
    return JSON.stringify(this)
  }

  public static fromJSON(json: string): ResultDTO {
    const data = JSON.parse(json)
    return new ResultDTO(
      data.status,
      data.transpiledCode,
      data.message,
      data.cached
    )
  }
}
