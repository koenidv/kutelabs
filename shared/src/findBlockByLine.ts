/**
 * Finds the most recent markBlock call before the user code line that caused an error
 * @param causingLine line number in the user code that caused the error
 * @returns block id of the block that caused the error, or undefined if not found
 */
export function findBlockByLine(codeLines: string[], causingLine: number): string | undefined {
  let blockId: string | undefined = undefined
  let currentLine = causingLine - 1
  while (!blockId && currentLine > 0 && causingLine - currentLine < 5) {
    blockId = codeLines[currentLine].match(/markBlock\("([^"]+)"\)/)?.pop()
    currentLine--
  }
  return blockId
}
