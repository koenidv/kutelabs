import type { VariableHInterface } from "../../variables/VariableHInterface"
import { BlockType } from "./BlockType"
import { DataType, type TsTypeByDataType } from "./DataType"
import type { DefinedExpression } from "./DefinedExpression"

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
          : T extends BlockType.LogicJunction
            ? BlockDataLogicJunction
            : T extends BlockType.LogicComparison
              ? BlockDataLogicComparison
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
  name: string
  variableHelper?: WeakRef<VariableHInterface>
}

export type BlockDataValue<Type extends DataType> = {
  type: Type
  value: TsTypeByDataType<Type>
  editable?: boolean
}

export enum LogicJunctionMode {
  And = "and",
  Or = "or",
}
export type BlockDataLogicJunction = {
  mode: LogicJunctionMode
  type: DataType.Boolean
}

export enum LogicComparisonOperator {
  Equal = "==",
  NotEqual = "!=",
  Greater = ">",
  GreaterOrEqual = ">=",
  Less = "<",
  LessOrEqual = "<=",
}
export const ComparisonOperatorTypeCompatibility: Record<LogicComparisonOperator, DataType[]> = {
  [LogicComparisonOperator.Equal]: [DataType.Int, DataType.Float, DataType.String, DataType.Boolean],
  [LogicComparisonOperator.NotEqual]: [DataType.Int, DataType.Float, DataType.String, DataType.Boolean],
  [LogicComparisonOperator.Greater]: [DataType.Int, DataType.Float],
  [LogicComparisonOperator.GreaterOrEqual]: [DataType.Int, DataType.Float],
  [LogicComparisonOperator.Less]: [DataType.Int, DataType.Float],
  [LogicComparisonOperator.LessOrEqual]: [DataType.Int, DataType.Float],
}
export type BlockDataLogicComparison = {
  mode: LogicComparisonOperator
  type: DataType.Boolean
}