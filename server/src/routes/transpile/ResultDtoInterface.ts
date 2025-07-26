import type { TranspilerHint } from "../../transpile/transpile.types"
import type { RequestError, TranspilationStatus } from "./Status"

export interface ResultDtoInterface {
  status: TranspilationStatus | RequestError
  transpiledCode: string | null
  entrypoint: string | null
  sourceMap: string | null
  transpilerHints: TranspilerHint[] | null
  message: string | null
  cached: boolean
}