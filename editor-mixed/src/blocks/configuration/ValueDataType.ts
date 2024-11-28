export enum ValueDataType {
  Int = "int",
  Float = "float",
  String = "string",
  Boolean = "boolean",

  IntArray = "array<int>",
  FloatArray = "array<float>",
  StringArray = "array<string>",
  BooleanArray = "array<boolean>",

  // todo store function reference in value and create a separate block for function output as input
}

export type TsTypeByValueType<T extends ValueDataType> =
  T extends ValueDataType.Int
    ? number
    : T extends ValueDataType.Float
      ? number
      : T extends ValueDataType.String
        ? string
        : T extends ValueDataType.Boolean
          ? boolean
          : T extends ValueDataType.IntArray
            ? number[]
            : T extends ValueDataType.FloatArray
              ? number[]
              : T extends ValueDataType.StringArray
                ? string[]
                : T extends ValueDataType.BooleanArray
                  ? boolean[]
                  : never
