import { Behavior } from "./Behavior"

export class BracesBehavior extends Behavior {
  handleKeyDown(e: KeyboardEvent): boolean {
    const ta = e.target as HTMLTextAreaElement
    if (
      e.key === "Backspace" &&
      BracesBehavior.selectionIsBetweenBraces(ta, true)
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
      ta.value.substring(this.findClosingIndex(ta) + 1)

    ta.value = newValue
    ta.selectionStart = ta.selectionEnd = selection - 1
  }

  static findClosingIndex(ta: HTMLTextAreaElement): number {
    const selection = ta.selectionStart - 1
    if (!["{", "("].includes(ta.value.at(selection)!)) return selection
    const find = ta.value.at(selection) == "{" ? "}" : ")"
    const index = ta.value.substring(selection).indexOf(find) + selection
    return index >= selection ? index : selection + 1
  }
}
