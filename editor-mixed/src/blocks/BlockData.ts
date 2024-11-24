import { BlockType } from "./BlockType"
import type { DefinedExpression } from "./DefinedExpression"

export type BlockDataByType<T extends BlockType> = T extends BlockType.Function
  ? BlockDataFunction
  : T extends BlockType.Expression
    ? BlockDataExpression
    : T extends BlockType.Value
      ? BlockDataInput
      : BlockDataEmpty

export type BlockDataEmpty = null

export type BlockDataFunction = {
  name: string
}

export type BlockDataExpression = {
  expression: DefinedExpression
  customExpression?: Map<string, string> // lang -> expression
  editable?: boolean
}

export type BlockDataInput = {
  input: string
}
