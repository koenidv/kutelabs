/**
 * Replaces all UUID blocks ids in block marking calls (usually markBlock(blockId)) with a block-# format.
 * This enables caching despite randomly generated block ids.
 * @param code The code to standardize block ids in.
 * @param idMatcher The regex to match block ids with. Defaults to /markBlock\("([0-9a-f-]+)"\)/g.
 * @returns The standardized code and a map of the original block ids to their standardized block ids.
 */
export function standardizeBlockIds(
  code: string,
   idMatcher: RegExp = /markBlock\("([0-9a-f-]+)"\)/g
  ): {code: string, ids: Map<string, string>} {
  const ids = new Map<string, string>()
  for (const match of code.matchAll(idMatcher)) {
    const newId = `block-${ids.size + 1}`
    ids.set(match[1], newId)
    code = code.replace(match[1], newId)
  }
  return {code, ids}
}

/**
 * Restores the original block ids from a block-id standardized code.
 * @param code Code with standardized block ids.
 * @param ids The map of original block ids to standardized block ids.
 * @returns The code with the original block ids restored.
 */
export function restoreBlockIds(code: string, ids: Map<string, string>): string {
  for (const [original, standardized] of ids) {
    code = code.replace(standardized, original)
  }
  return code
}