import type { TranspilationStatus } from "../../transpile/TranspilationStatus"

export interface ResultDtoInterface {
  status: TranspilationStatus
  transpiledCode: string | null
  message: string | null
  cached: boolean
}