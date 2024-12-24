import type { BlockDataVariableInit } from "../blocks/configuration/BlockData";

export interface VariableHInterface {
  isNameAvailable(name: string): boolean
  getVariables(): BlockDataVariableInit<any>[]
}
