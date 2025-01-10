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

  // todo store function reference in value and create a separate block for function output as input
}

export type TsTypeByDataType<T extends DataType> =
  T extends DataType.Int
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
