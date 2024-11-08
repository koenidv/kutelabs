import { Behavior } from "./Behavior"

export class BracesBehavior extends Behavior {
  handleKeyDown(e: KeyboardEvent): boolean {
    const ta = e.target as HTMLTextAreaElement
    if (
      e.key === "Backspace" &&
      BracesBehavior.selectionIsBetweenBraces(ta)
    ) {
      e.preventDefault()
      BracesBehavior.removeBraces(ta)
      return true
    }

    if (e.key === "{") {
      e.preventDefault()
      BracesBehavior.insertText(ta, "{}", 1)
      return true
    }

    if (e.key === "(") {
      e.preventDefault()
      BracesBehavior.insertText(ta, "()", 1)
      return true
    }

    return false
  }

  static removeBraces(ta: HTMLTextAreaElement) {
    const selection = ta.selectionStart
    const newValue =
      ta.value.substring(0, ta.selectionStart - 1) +
      ta.value.substring(ta.selectionStart + 1)

    ta.value = newValue
    ta.selectionStart = ta.selectionEnd = selection - 1
  }

  static isAtEndOfLine(ta: HTMLTextAreaElement): boolean {
    const selectionIndex = this.getSelectedLines(ta)[0]
    const splitText = ta.value.split("\n")
    const charactersUntilEndOfLine = splitText.reduce((acc, line, index) => {
      if (index <= selectionIndex) {
        return acc + line.length + 1
      }
      return acc
    }, 0)

    return charactersUntilEndOfLine === ta.selectionStart + 1
  }
}
