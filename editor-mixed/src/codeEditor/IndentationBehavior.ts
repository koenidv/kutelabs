import { Behavior } from "./Behavior"

export class IndentationBehavior extends Behavior {
  handleKeyDown(e: KeyboardEvent): boolean {
    const ta = e.target as HTMLTextAreaElement
    if (e.key === "Tab") {
      e.preventDefault()
      const selectedLines = IndentationBehavior.getSelectedLines(ta)
      if (e.shiftKey)
        IndentationBehavior.decreaseLineIndentation(ta, ...selectedLines)
      else IndentationBehavior.increaseLineIndentation(ta, ...selectedLines)
      return true
    } else if (e.key === "Enter") {
      e.preventDefault()
      const newIndentation = IndentationBehavior.getNewLineIndentation(ta)
      const betweenBraces = IndentationBehavior.selectionIsBetweenBraces(ta)

      let insertText = "\n" + newIndentation
      const adjustCursor = insertText.length
      if (betweenBraces) {
        insertText += "\n" + IndentationBehavior.getCurrentIndentation(ta)
      }

      IndentationBehavior.insertText(ta, insertText, adjustCursor)

      return true
    }
    return false
  }

  static increaseLineIndentation(ta: HTMLTextAreaElement, ...lines: number[]) {
    const selection = this.getSelection(ta)
    const splitText = ta.value.split("\n")
    for (const line of lines) {
      splitText[line] = "\t" + splitText[line]
    }
    ta.value = splitText.join("\n")

    ta.selectionStart = selection.start + lines.length
    ta.selectionEnd = selection.end + lines.length
  }

  static decreaseLineIndentation(ta: HTMLTextAreaElement, ...lines: number[]) {
    const selection = this.getSelection(ta)
    const splitText = ta.value.split("\n")
    let changed = 0
    for (const line of lines) {
      if (splitText[line].startsWith("\t")) {
        splitText[line] = splitText[line].replace(/^\t/, "")
        changed++
      }
    }
    ta.value = splitText.join("\n")

    ta.selectionStart = selection.start - changed
    ta.selectionEnd = selection.end - changed
  }

  static getCurrentIndentation(ta: HTMLTextAreaElement): string {
    const lines = ta.value.substring(0, ta.selectionStart).split("\n")
    const selectedLine = lines[this.getSelectedLines(ta)[0]]
    const indentMatch = selectedLine.match(/^(\s*)/)
    return indentMatch ? indentMatch[1] : ""
  }

  static getNewLineIndentation(ta: HTMLTextAreaElement): string {
    const lines = ta.value.substring(0, ta.selectionStart).split("\n")
    const selectedLine = lines[this.getSelectedLines(ta)[0]]
    const indentMatch = selectedLine.match(/^(\s*)/)
    let indentation = indentMatch ? indentMatch[1] : ""

    const trimmed = selectedLine.trim()
    if (
      trimmed.length > 0 &&
      ["{", "("].includes(trimmed.at(trimmed.length - 1)!)
    ) {
      indentation += "\t"
    }

    return indentation
  }
}
