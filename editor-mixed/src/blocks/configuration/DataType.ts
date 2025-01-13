export enum DataType {
  Int = "int",
  Float = "float",
  String = "string",
  Boolean = "boolean",

  IntArray = "array<int>",
  FloatArray = "array<float>",
  StringArray = "array<string>",
  BooleanArray = "array<boolean>",

  Dynamic = "dynamic",
  FunctionReference = "functiion_reference",
  FunctionInvokation = "function_invokation",
}

export type SimpleDataType = Extract<
  DataType,
  DataType.Int | DataType.Float | DataType.String | DataType.Boolean
>

export function isArrayType(type: DataType): boolean {
  return type == DataType.IntArray || type == DataType.FloatArray || type == DataType.StringArray || type == DataType.BooleanArray
}
export function simpleTypeFromArrayType(type: DataType): SimpleDataType {
  switch (type) {
    case DataType.IntArray:
      return DataType.Int
    case DataType.FloatArray:
      return DataType.Float
    case DataType.StringArray:
      return DataType.String
    case DataType.BooleanArray:
      return DataType.Boolean
    default:
      throw new Error(`Type ${type} is not an array type`)
  }
}

export type TsTypeByDataType<T extends DataType> = T extends DataType.Int
  ? number
  : T extends DataType.Float
    ? number
    : T extends DataType.String
      ? string
      : T extends DataType.Boolean
        ? boolean
        : T extends DataType.IntArray
          ? number[]
          : T extends DataType.FloatArray
            ? number[]
            : T extends DataType.StringArray
              ? string[]
              : T extends DataType.BooleanArray
                ? boolean[]
                : T extends DataType.Dynamic
                  ? any
                  : never
