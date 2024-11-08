export abstract class Behavior {
  abstract handleKeyDown(e: KeyboardEvent): boolean

  static getSelection(ta: HTMLTextAreaElement): {
    start: number
    end: number
  } {
    return {
      start: ta.selectionStart ?? 0,
      end: ta.selectionEnd ?? 0,
    }
  }

  static getSelectedLines(ta: HTMLTextAreaElement): number[] {
    const selection = this.getSelection(ta)
    const splitText = ta.value.split("\n")
    let charCount = 0
    const selectedLines: number[] = []

    for (const indexed of splitText.entries()) {
      const [i, line] = indexed
      const lineEnd = charCount + line.length

      if (
        (selection.start <= lineEnd && selection.end >= charCount) ||
        (selection.start <= charCount && selection.end >= lineEnd)
      ) {
        selectedLines.push(i)
      }

      charCount += line.length + 1
      if (charCount > selection.end) break
    }

    return selectedLines
  }

  static insertText(
    ta: HTMLTextAreaElement,
    text: string,
    cursorOffset: number = text.length
  ) {
    const selection = ta.selectionStart
    const newValue =
      ta.value.substring(0, ta.selectionStart) +
      text +
      ta.value.substring(ta.selectionEnd)

    ta.value = newValue
    ta.selectionStart = ta.selectionEnd = selection + cursorOffset
  }
}
