import type { BlockDataFunction } from "../blocks/configuration/BlockData"
import type { DataType } from "../blocks/configuration/DataType"

export interface FunctionHInterface {
  entrypoint: string
  isNameAvailable(name: string): boolean
  nextAvailableName(base: string): string
  getParams(name: string): BlockDataFunction["params"] | undefined
  getReturnType(name: string): DataType | undefined
}
