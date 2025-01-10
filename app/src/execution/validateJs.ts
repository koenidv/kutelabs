import * as acorn from "acorn"

export function validateJs(code: string): { valid: boolean; line?: number; message?: string } {
  try {
    acorn.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    })
    return { valid: true }
  } catch (error) {
    if (error instanceof SyntaxError) {
      const syntaxError = error as SyntaxError & { loc: { line: number; column: number } }
      return {
        valid: false,
        message: syntaxError.message,
        line: syntaxError.loc.line,
      }
    }
    return {
      valid: false,
    }
  }
}
