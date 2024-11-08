import { Behavior } from "./Behavior"

export class IndentationBehavior extends Behavior {
  handleKeyDown(e: KeyboardEvent): boolean {
    const ta = e.target as HTMLTextAreaElement
    console.log(ta)
    if (e.key === "Tab") {
      e.preventDefault()
      const selectedLines = IndentationBehavior.getSelectedLines(ta)
      if (e.shiftKey) IndentationBehavior.decreaseLineIndentation(ta, ...selectedLines)
      else IndentationBehavior.increaseLineIndentation(ta, ...selectedLines)
      return true
    } else if (e.key === "Enter") {
      e.preventDefault()
      const newIndentation = IndentationBehavior.getNewLineIndentation(ta)
      IndentationBehavior.insertText(ta, "\n" + newIndentation)
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

  static getNewLineIndentation(ta: HTMLTextAreaElement): string {
    const currentPosition = ta.selectionStart
    const lines = ta.value.substring(0, currentPosition).split("\n")
    const currentLine = lines[lines.length - 1]

    // Get the indentation of the current line
    const indentMatch = currentLine.match(/^(\s*)/)
    let indent = indentMatch ? indentMatch[1] : ""

    // Increase indentation if the line ends with an opening brace
    if (currentLine.trim().endsWith("{")) {
      indent += "\t"
    }

    return indent
  }
}
