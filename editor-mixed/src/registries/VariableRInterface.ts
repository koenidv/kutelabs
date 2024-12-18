import type { ValueDataType } from "../blocks/configuration/ValueDataType"

export interface VariableRInterface {
  isNameAvailable(name: string): boolean
  getVariables(): { name: string; type: ValueDataType }[]
  getVariableType(name: string): ValueDataType | null
}
