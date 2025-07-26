import { type TranspilationResult, type TranspilerHint } from "../../transpile/transpile.types"
import { RequestError, TranspilationStatus } from "./Status"
import type { ResultDtoInterface } from "./ResultDtoInterface"
import { trimErrorMessage } from "../../transpile/transpileUtils"

export class ResultDTO implements ResultDtoInterface {
  status: TranspilationStatus | RequestError
  transpiledCode: string | null
  entrypoint: string | null
  sourceMap: string | null = null
  transpilerHints: TranspilerHint[] | null = null
  message: string | null = null
  cached: boolean = false

  private constructor(
    status: TranspilationStatus | RequestError,
    transpiledCode: string | null = null,
    entrypoint: string | null = null,
    sourceMap: string | null = null,
    transpilerHints: TranspilerHint[] | null = null,
    message: string | null = null,
    cached: boolean = false
  ) {
    this.status = status
    this.transpiledCode = transpiledCode
    this.entrypoint = entrypoint
    this.sourceMap = sourceMap
    this.transpilerHints = transpilerHints
    this.message = message
    this.cached = cached
  }

  public static error(
    status: TranspilationStatus | RequestError,
    message: string | null = null
  ): ResultDTO {
    return new ResultDTO(status, null, null, null, null, message)
  }

  public static fromTranspilationResult(result: TranspilationResult): ResultDTO {
    switch (result.status) {
      case TranspilationStatus.Success:
        return new ResultDTO(
          TranspilationStatus.Success,
          result.transpiled,
          result.entrypoint,
          "sourcemap" in result ? result.sourcemap : null,
          "transpilerHints" in result ? result.transpilerHints : null
        )
      case TranspilationStatus.CompilationError:
      case TranspilationStatus.Timeout:
        console.error("Compilation error", result, result.message)
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
      data.entrypoint,
      data.sourceMap,
      data.transpilerHints,
      data.message,
      data.cached
    )
  }
}
