import {
  TranspilationStatus,
  type TranspilationResult,
} from "../../transpile/transpile"

export enum TranspilatonError {
  compilationError = "compilationError",
  timeout = "timeout",
  noCode = "noCode",
  unknown = "unknown",
}

export class ResultDTO {
  transpiledCode: string | null
  cached: boolean | null
  error: TranspilatonError | null

  private constructor(
    transpiledCode: string | null,
    cached: boolean | null,
    error: TranspilatonError | null
  ) {
    this.transpiledCode = transpiledCode
    this.cached = cached
    this.error = error
  }

  public static compiled(transpiledCode: string): ResultDTO {
    return new ResultDTO(transpiledCode, false, null)
  }

  public static cached(transpiledCode: string): ResultDTO {
    return new ResultDTO(transpiledCode, true, null)
  }

  public static error(error: TranspilatonError): ResultDTO {
    return new ResultDTO(null, null, error)
  }

  public static fromTranspilationResult(result: TranspilationResult) {
    switch (result.status) {
      case TranspilationStatus.Success:
        return ResultDTO.compiled(result.transpiled!)
      case TranspilationStatus.CompilationError:
        return ResultDTO.error(TranspilatonError.compilationError)
      case TranspilationStatus.Timeout:
        return ResultDTO.error(TranspilatonError.timeout)
      case TranspilationStatus.UnknownError:
      default:
        return ResultDTO.error(TranspilatonError.unknown)
    }
  }
}
