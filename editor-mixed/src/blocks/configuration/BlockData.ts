import { BlockType } from "./BlockType"
import type { DefinedExpression } from "../DefinedExpression"
import { ValueDataType, type TsTypeByValueType } from "./ValueDataType"

export type BlockDataByType<
  T extends BlockType,
  S = never,
> = T extends BlockType.Function
  ? BlockDataFunction
  : T extends BlockType.Expression
    ? BlockDataExpression
    : T extends BlockType.Value
      ? BlockDataValue<S extends ValueDataType ? ValueDataType : never>
      : T extends BlockType.Variable
        ? BlockDataVariable<S extends ValueDataType ? ValueDataType : never>
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

export type BlockDataVariable<Type extends ValueDataType> = {
  name: string
  type: Type
}

export type BlockDataValue<Type extends ValueDataType> = {
  type: Type
  input: TsTypeByValueType<Type>
  editable?: boolean
}