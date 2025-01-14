import type { RequestError, TranspilationStatus } from "./Status"

export interface ResultDtoInterface {
  status: TranspilationStatus | RequestError
  transpiledCode: string | null
  sourceMap: string | null
  message: string | null
  cached: boolean
}
