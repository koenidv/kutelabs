import type { BlockDataVariableInit } from "../blocks/configuration/BlockData";

export interface VariableHInterface {
  isNameAvailable(name: string): boolean
  getVariables(): BlockDataVariableInit<any>[]
  nextAvailableName(base: string): string
  getVariableType(name: string): string | undefined
  getVariableMutable(name: string): boolean | undefined
}
