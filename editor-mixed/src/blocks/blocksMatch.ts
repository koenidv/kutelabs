import type { AnyBlock } from "./Block"
import { BlockType } from "./configuration/BlockType"

export function blocksAreSimiliar(a: AnyBlock, b: AnyBlock): boolean {
  if (a.type != b.type) return false
  const aData = a.data as Record<string, unknown>
  const bData = b.data as Record<string, unknown>
  if (aData["name"] != bData["name"] && a.type != BlockType.VarInit) return false
  if (aData["type"] != bData["type"] && a.type != BlockType.VarInit) return false
  if (aData["expression"] != bData["expression"]) return false
  if (aData["customExpression"] != bData["customExpression"]) return false
  if (aData["editable"] != bData["editable"]) return false
  if (aData["editable"] === false && aData["value"] != bData["value"]) return false
  return true
}
