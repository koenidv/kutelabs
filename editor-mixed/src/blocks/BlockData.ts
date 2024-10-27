import { BlockType } from "./BlockType"
import type { DefinedExpression } from "./DefinedExpression"

export type BlockDataByType<T extends BlockType> = T extends BlockType.Function
  ? BlockDataFunction
  : T extends BlockType.Expression
    ? BlockDataExpression
    : T extends BlockType.Input
      ? BlockDataInput
      : BlockDataEmpty

export type BlockDataEmpty = null

export type BlockDataFunction = {
  name: string
}

export type BlockDataExpression = {
  expression: DefinedExpression
  customExpression?: string
}

export type BlockDataInput = {
  input: string
}
