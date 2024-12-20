import type { ValueDataType } from "../blocks/configuration/ValueDataType"

export type VariableMeta = { name: string; type: ValueDataType; isMutable: boolean }

export interface VariableHInterface {
  isNameAvailable(name: string): boolean
  getVariables(): VariableMeta[]
}