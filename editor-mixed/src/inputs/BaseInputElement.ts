// PrismLitEditor.ts
import { LitElement, css, type TemplateResult } from "lit"

import "prismjs/components/prism-kotlin"
import "prismjs/plugins/match-braces/prism-match-braces"
import type { Behavior } from "./Behavior"
import { createRef } from "lit/directives/ref.js"
import { normalizePrimaryPointerPosition } from "../util/InputUtils"

export abstract class BaseInputElement extends LitElement {
  protected inputRef = createRef<HTMLInputElement | HTMLTextAreaElement>()

  declare input: string
  declare inDrawer: boolean

  static properties = {
    input: { type: String },
    inDrawer: { type: Boolean },
  }

  constructor() {
    super()
    this.input = ""
  }

  abstract behaviors: Behavior[]

  static styles = [
    css`
      :host {
        display: block;
        overflow: auto;
        position: relative;
        width: 100%;
        height: 100%;
      }
      input,
      textarea.input,
      pre.highlighted {
        font-family: monospace;
        font-size: 14px;
        line-height: 1.5;
        tab-size: 2;
        padding: 0;
        margin: 0;
        min-width: 100%;
        min-height: 100%;
        width: max-content;
        height: max-content;
        white-space: pre;
      }
      input,
      textarea.input {
        position: absolute;
        top: 0;
        left: 0;
        resize: none;
        outline: none;
        border: none;
        overflow: hidden;
      }
    `,
  ]

  abstract render(): TemplateResult<1>
  /**
   * Called after the input value has changed and behaviors were applied
   * @param _e input event
   */
  onInput(_e: Event): void {}

  protected handleInput(e: Event) {
    this.input = (e.target as HTMLInputElement | HTMLTextAreaElement).value || ""
    this.dispatchEvent(new CustomEvent("input-change", { detail: { input: this.input } }))
    this.onInput(e)
  }

  protected handleKeyDown(e: KeyboardEvent) {
    let handled = false
    for (const behavior of this.behaviors) {
      if (!handled) handled = behavior.handleKeyDown(e)
    }
    if (handled) e.target?.dispatchEvent(new Event("input", { bubbles: true }))
  }

  /**
   * Relay mousedown / touchstart events that are dispatched from the tapdrag layer to the outer component.
   * Dispatched events will be ignored by the textarea, so we have to set the selection and focus manually.
   * @param evt received mousedown or touchstart event
   */
  private handleStartFromTapDrag(evt: MouseEvent | TouchEvent) {
    if (evt.isTrusted || evt.defaultPrevented || this.inDrawer) return
    const selection = this.approximateCaretPosition(
      this.inputRef.value!,
      ...normalizePrimaryPointerPosition(evt)!.toArray()
    )
    this.inputRef.value!.setSelectionRange(selection, selection)
    this.inputRef.value!.focus()
    evt.stopPropagation()
  }

  connectedCallback(): void {
    this.addEventListener("mousedown", this.handleStartFromTapDrag.bind(this))
    this.addEventListener("touchstart", this.handleStartFromTapDrag.bind(this))
    super.connectedCallback()
  }

  disconnectedCallback(): void {
    this.removeEventListener("mousedown", this.handleStartFromTapDrag.bind(this))
    this.removeEventListener("touchstart", this.handleStartFromTapDrag.bind(this))
    super.disconnectedCallback()
  }

  /**
   * Approximates the text selection index in a textarea
   * This is needed because, for security reasons, inputs ignore non-trusted events
   * @param textarea - The textarea HTML element
   * @param x - The X coordinate relative to the viewport
   * @param y - The Y coordinate relative to the viewport
   * @returns The approximate index position in the text
   */
  private approximateCaretPosition(
    textarea: HTMLInputElement | HTMLTextAreaElement,
    x: number,
    y: number
  ): number {
    const style = window.getComputedStyle(textarea)
    const rect = textarea.getBoundingClientRect()

    const line = this.calculateLineIndexOffset(
      textarea.value,
      style,
      y - rect.top - parseFloat(style.paddingTop) + textarea.scrollTop
    )

    const char = this.approximateCharacterIndexOffset(
      line.currentLine,
      style,
      x - rect.left - parseFloat(style.paddingLeft)
    )

    return (line.charIndex + char).coerceIn(0, textarea.value.length)
  }

  /**
   * Calculates which line is at the given y position, using the style's line height
   * @param value value of the textarea with \n line seperators
   * @param style textarea's computed styles
   * @param relativeY y position relative to the textarea
   * @returns value index of the first character in the selected line, and the line itself
   */
  private calculateLineIndexOffset(value: string, style: CSSStyleDeclaration, relativeY: number) {
    const lineHeight =
      style.lineHeight === "normal"
        ? parseFloat(style.fontSize) * 1.2
        : parseFloat(style.lineHeight)

    const line = Math.floor(relativeY / lineHeight)
    const lines = value.split("\n")
    const lineStartIndex = lines.slice(0, line).reduce((acc, line) => acc + line.length + 1, 0)

    if (line >= lines.length)
      return {
        charIndex: value.length,
        currentLine: lines[lines.length - 1],
      }

    return {
      charIndex: lineStartIndex,
      currentLine: lines[line] || "",
    }
  }

  /**
   * Approximates which character was selected in a given line based on an average character width
   * This works for monospace fonts (if the right character width is selected) but will break on inputs with standard fonts
   * @param selectedLine calculated selected line to limit character index
   * @param style textareaa's computed styles
   * @param relativeX x position relative to the textarea
   * @param charWidthFactor character width divided by font size for the selected font
   * @returns approximated selected character index in the current line
   */
  private approximateCharacterIndexOffset(
    selectedLine: string,
    style: CSSStyleDeclaration,
    relativeX: number,
    charWidthFactor: number = 0.6
  ) {
    const charWidth = parseFloat(style.fontSize) * charWidthFactor

    // Calculate the precise character position based on click position
    const charPosition = relativeX / charWidth
    const charFloored = Math.floor(charPosition)
    const charFraction = charPosition - charFloored

    // If click is closer to the previous character (less than 0.5 of character width)
    let targetChar = charFraction < 0.5 ? charFloored : charFloored + 1

    return Math.min(targetChar, selectedLine.length)
  }
}
