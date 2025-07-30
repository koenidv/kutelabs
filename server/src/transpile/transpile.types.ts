import { TranspilationStatus } from "../routes/transpile/Status"

export type ErrorResult = {
  status:
    | TranspilationStatus.CompilationError
    | TranspilationStatus.Timeout
    | TranspilationStatus.CacheError
    | TranspilationStatus.InvalidOptions
    | TranspilationStatus.EmptyInput
    | TranspilationStatus.UnknownError
  message: string
  transpilerHints?: TranspilerHint[]
}

export type SuccessResultKute = {
  status: TranspilationStatus.Success
  transpiled: string
  entrypoint: string
  sourcemap?: string
}

export type SuccessResultPlayground = {
  status: TranspilationStatus.Success
  transpiled: string
  entrypoint: string
  transpilerHints?: TranspilerHint[]
}

export type TranspilationResult = ErrorResult | SuccessResultKute | SuccessResultPlayground

export type TranspilerHint = {
  interval: {
    start: {
      line: number
      ch: number
    }
    end: {
      line: number
      ch: number
    }
  }
  message: string
  severity: "ERROR" | "WARNING" | "INFO"
  className: string
}

export interface KotlinPlayResultDto {
  jsCode: string | null
  exception: string | null
  errors: { "File.kt": TranspilerHint[] }
  text: string
}
