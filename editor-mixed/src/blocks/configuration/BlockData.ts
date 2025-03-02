import type { FunctionHInterface } from "../../sideeffects/FunctionHInterface"
import type { VariableHInterface } from "../../sideeffects/VariableHInterface"
import { BlockType } from "./BlockType"
import { DataType, type TsTypeByDataType } from "./DataType"
import type { DefinedExpression } from "./DefinedExpression"

export type BlockDataByType<T extends BlockType, D = DataType> = T extends BlockType.Function
  ? BlockDataFunction
  : T extends BlockType.FunctionInvoke
    ? BlockDataFunctionReference
    : T extends BlockType.Expression
      ? BlockDataExpression
      : T extends BlockType.Value
        ? BlockDataValue<D>
        : T extends BlockType.VarInit
          ? BlockDataVariableInit<D>
          : T extends BlockType.Variable
            ? BlockDataVariable
            : T extends BlockType.LogicJunction
              ? BlockDataLogicJunction
              : T extends BlockType.LogicComparison
                ? BlockDataLogicComparison
                : T extends BlockType.MathOperation
                  ? BlockDataMathOperation
                  : BlockDataEmpty

export type BlockDataEmpty = null

/*
 * Block Type Specific Data
 */

export type BlockDataFunction = {
  name: string
  params: {
    name: string
    type: DataType
    registeredName?: string
  }[]
  isMain?: true | undefined
  nameEditable?: boolean
  paramsEditable?: boolean
}

export type BlockDataFunctionReference = {
  // used for both reference and invocation, but references are not implemented yet
  type: DataType.FunctionReference | DataType.FunctionInvokation
  name: string
  functionHelper?: WeakRef<FunctionHInterface>
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
  nameEditable?: boolean
  typeEditable?: boolean
}

export type BlockDataVariable = {
  name: string
  variableHelper?: WeakRef<VariableHInterface>
}

export type BlockDataValue<Type extends DataType> = {
  type: Type
  value: TsTypeByDataType<Type>
  editable?: boolean
  placeholder?: string
}

export enum LogicJunctionMode {
  And = "and",
  Or = "or",
}
export type BlockDataLogicJunction = {
  mode: LogicJunctionMode
  type: DataType.Boolean
  editable?: boolean
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
  [LogicComparisonOperator.Equal]: [
    DataType.Int,
    DataType.Float,
    DataType.String,
    DataType.Boolean,
  ],
  [LogicComparisonOperator.NotEqual]: [
    DataType.Int,
    DataType.Float,
    DataType.String,
    DataType.Boolean,
  ],
  [LogicComparisonOperator.Greater]: [DataType.Int, DataType.Float],
  [LogicComparisonOperator.GreaterOrEqual]: [DataType.Int, DataType.Float],
  [LogicComparisonOperator.Less]: [DataType.Int, DataType.Float],
  [LogicComparisonOperator.LessOrEqual]: [DataType.Int, DataType.Float],
}
export type BlockDataLogicComparison = {
  mode: LogicComparisonOperator
  type: DataType.Boolean
  editable?: boolean
}

export enum MathOperation {
  Add = "+",
  Subtract = "-",
  Multiply = "*",
  Divide = "/",
  Modulo = "%",
}
export const MathOperationTypeCompatibility: Record<MathOperation, DataType[]> = {
  [MathOperation.Add]: [DataType.Int, DataType.Float],
  [MathOperation.Subtract]: [DataType.Int, DataType.Float],
  [MathOperation.Multiply]: [DataType.Int, DataType.Float],
  [MathOperation.Divide]: [DataType.Int, DataType.Float],
  [MathOperation.Modulo]: [DataType.Int],
}
export type BlockDataMathOperation = {
  mode: MathOperation
  type: DataType
  editable?: boolean
}
