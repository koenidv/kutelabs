export abstract class Behavior {
  /**
   * Invokes the behavior on key down
   * @param e the keydown event
   * @returns true if the keydown was handled and following behaviors should not be invoked
   */
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

  static selectionIsBetweenBraces(
    ta: HTMLTextAreaElement,
    ignoreNewlines = false
  ): boolean {
    if (ta.selectionStart != ta.selectionEnd) return false
    const text = ignoreNewlines ? ta.value.replaceAll("\n", "") : ta.value
    if (
      text.at(ta.selectionStart - 1) == "{" &&
      text.at(ta.selectionStart) == "}"
    ) {
      return true
    }
    if (
      text.at(ta.selectionStart - 1) == "(" &&
      text.at(ta.selectionStart) == ")"
    ) {
      return true
    }
    return false
  }
}
