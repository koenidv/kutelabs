import type { DataType } from "./DataType"

export enum DefinedExpression {
  Custom = "Custom",
  Println = "Println",
}

export const DefinedExpressionData: Record<
  DefinedExpression,
  { js: string; kt: string; inputs: (DataType | "any")[]; display: string }
> = {
  Custom: {
    js: "",
    kt: "",
    inputs: [],
    display: "Custom",
  },
  Println: {
    js: "console.log({{0}})",
    kt: "println({{0}})",
    inputs: ["any"],
    display: "Print",
  },
}
