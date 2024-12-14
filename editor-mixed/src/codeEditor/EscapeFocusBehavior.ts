import { Behavior } from "./Behavior"

export class EscapeFocusBehavior extends Behavior {
  handleKeyDown(e: KeyboardEvent): boolean {
    if (e.key === "Escape") {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
      return true
    }
    return false
  }
}
