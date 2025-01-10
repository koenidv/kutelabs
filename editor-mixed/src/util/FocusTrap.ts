import type { Ref } from "lit/directives/ref.js"
import { findShadowedActiveElement } from "./DOMUtils"

interface FocusTrapOptions {
  onDeactivate?: () => void
}

export class FocusTrap {
  private readonly trapRef: Ref<HTMLElement>
  private readonly onEscape?: () => void

  private focusableElements: NodeListOf<HTMLElement> | null = null
  private firstFocusable: HTMLElement | null = null
  private lastFocusable: HTMLElement | null = null
  private previousActiveElement: HTMLElement | null = null

  constructor(trapRef: Ref<HTMLElement>, onEscape?: () => void) {
    this.trapRef = trapRef
    this.onEscape = onEscape
  }

  public activate() {
    document.addEventListener("keydown", this.handleKeydown)
  }

  public deactivate(): void {
    document.removeEventListener("keydown", this.handleKeydown)
    this.focusableElements = null
    this.previousActiveElement?.focus()
  }

  public handleKeydown = (e: KeyboardEvent): void => {
    if (e.key == "Escape") {
      this.deactivate()
      this.onEscape?.()
      return
    }
    if (e.key != "Tab") return
    const activeElement = findShadowedActiveElement(document)

    if (this.focusableElements == null) {
      this.setUpFocusTrap(activeElement as HTMLElement | null)
      e.preventDefault()
      return
    }

    if (e.shiftKey) {
      if (activeElement == this.firstFocusable) {
        e.preventDefault()
        this.lastFocusable?.focus()
      }
      return
    }

    if (activeElement == this.lastFocusable) {
      e.preventDefault()
      this.firstFocusable?.focus()
    }
  }

  private setUpFocusTrap(currentActive: HTMLElement | null): void {
    if (this.trapRef.value == null) {
      console.error("Could not set up focus trap; element ref is not set")
      return
    }
    this.previousActiveElement = currentActive

    const focusableSelectors = [
      "button",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ")

    this.focusableElements = this.trapRef.value.querySelectorAll(focusableSelectors)
    this.firstFocusable = this.focusableElements[0] || null
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null
    this.firstFocusable?.focus()
  }
}
