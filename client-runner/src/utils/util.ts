import type { NestedStrings } from "../types/nested.types"

export function stringifyNestedStrings(nested: NestedStrings): string {
  const pairs = Object.entries(nested).map(([key, value]) => {
    if (typeof value === "object") {
      return `${key}:${stringifyNestedStrings(value)}`
    }
    return `${key}:(${value.toString()})`
  })

  return "{" + pairs.join(",") + "}"
}
