import { Behavior } from "./Behavior"

export class QuotesBehavior extends Behavior {
  handleKeyDown(e: KeyboardEvent): boolean {
    const ta = e.target as HTMLTextAreaElement
    if (
      (e.key === '"' || e.key === "'") &&
      ta.selectionStart != ta.selectionEnd
    ) {
      e.preventDefault()
      QuotesBehavior.addQuotes(ta)
      return true
    }

    return false
  }

  static addQuotes(ta: HTMLTextAreaElement, quote: string = '"') {
    const selection = this.getSelection(ta)
    const value = ta.value.substring(selection.start, selection.end)

    ta.value =
      ta.value.substring(0, selection.start) +
      quote +
      value +
      quote +
      ta.value.substring(selection.end)

    ta.selectionStart = selection.start + 1
    ta.selectionEnd = selection.end + 1
  }
}
