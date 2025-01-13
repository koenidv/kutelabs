import type { BlockDataVariableInit } from "../blocks/configuration/BlockData";
import type { DataType } from "../blocks/configuration/DataType";

export interface VariableHInterface {
  getVariables(): BlockDataVariableInit<any>[]
  
  isNameAvailable(name: string): boolean
  nextAvailableName(base: string): string
  
  getVariableType(name: string): DataType | undefined
  getVariableMutable(name: string): boolean | undefined

  registerParameter(name: string, type: DataType, mutable: false): void
  updateParameterType(name: string, type: DataType): void
  updateParameterName(oldName: string, newName: string): void
  removeParameter(name: string): void
}
