import type { VariableHelper } from "../../variables/VariableHelper"
import type { VariableHInterface } from "../../variables/VariableHInterface"
import { BlockType } from "./BlockType"
import type { DefinedExpression } from "./DefinedExpression"
import { DataType, type TsTypeByDataType } from "./DataType"

export type BlockDataByType<T extends BlockType, S = never> = T extends BlockType.Function
  ? BlockDataFunction
  : T extends BlockType.Expression
    ? BlockDataExpression
    : T extends BlockType.Value
      ? BlockDataValue<S extends DataType ? S : never>
      : T extends BlockType.VarInit
        ? BlockDataVariableInit<S extends DataType ? S : never>
        : T extends BlockType.Variable
          ? BlockDataVariable
          : BlockDataEmpty

export type BlockDataEmpty = null

/*
 * Block Type Specific Data
 */

export type BlockDataFunction = {
  name: string
}

export type BlockDataExpression = {
  expression: DefinedExpression
  customExpression?: Map<string, string> // lang -> expression
  editable?: false | { lang: string; linesHeight?: number; maxLines?: number }
}

export type BlockDataVariableInit<Type extends DataType> = {
  name: string
  type: Type
  mutable: boolean
}

export type BlockDataVariable = {
  name: string,
  variableHelper?: WeakRef<VariableHInterface>
}

export type BlockDataValue<Type extends DataType> = {
  type: Type
  value: TsTypeByDataType<Type>
  editable?: boolean
}
