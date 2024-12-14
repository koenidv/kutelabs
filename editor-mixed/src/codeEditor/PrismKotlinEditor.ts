// PrismLitEditor.ts
import { LitElement, html, css, unsafeCSS } from "lit"
import { customElement } from "lit/decorators.js"
import { unsafeHTML } from "lit/directives/unsafe-html.js"
import Prism from "prismjs"

import "prismjs/components/prism-kotlin"
import prismStyles from "prismjs/themes/prism.css?inline"
import themeStyles from "prismjs/themes/prism-okaidia.css?inline"
import "prismjs/plugins/match-braces/prism-match-braces"
import { IndentationBehavior } from "./IndentationBehavior"
import { BracesBehavior } from "./BracesBehavior"
import type { Behavior } from "./Behavior"
import { QuotesBehavior } from "./QuotesBehavior"
import { createRef, ref } from "lit/directives/ref.js"

@customElement("prism-kotlin-editor")
export class PrismKotlinEditor extends LitElement {
  textareaRef = createRef<HTMLTextAreaElement>()

  declare input: string
  declare highlighted: string

  static properties = {
    input: { type: String },
    highlighted: { type: String, state: true },
  }

  constructor() {
    super()
    this.input = ""
    this.highlighted = ""
  }

  behaviours: Behavior[] = [new BracesBehavior(), new IndentationBehavior(), new QuotesBehavior()]

  static styles = [
    unsafeCSS(prismStyles),
    unsafeCSS(themeStyles),
    css`
      :host {
        display: block;
        overflow: auto;
        position: relative;
        width: 100%;
        height: 100%;
      }
      .container {
        min-width: 100%;
        min-height: 100%;
        width: max-content;
        height: max-content;
        position: relative;
        overflow: hidden;
        background: #272822;
        border-radius: 0.3rem;
      }
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
      textarea.input {
        position: absolute;
        top: 0;
        left: 0;
        resize: none;
        background: transparent;
        color: transparent;
        caret-color: white;
        outline: none;
        border: none;
        overflow: hidden;
      }
      pre.highlighted {
        pointer-events: none;
      }
    `,
  ]

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("input")) {
      this.highlightCode()
    }
  }

  render() {
    return html`
      <div class="container">
        <pre class="highlighted language-kotlin"><code>${unsafeHTML(this.highlighted)}</code></pre>
        <textarea
          ${ref(this.textareaRef)}
          class="input"
          .value=${this.input}
          @input=${this.handleInput}
          @keydown=${this.handleKeyDown}
          spellcheck="false"></textarea>
      </div>
    `
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    this.input = target.value || ""
    this.dispatchEvent(new CustomEvent("code-change", { detail: { code: this.input } }))
    this.highlightCode()
  }

  private handleKeyDown(e: KeyboardEvent) {
    let handled = false
    for (const behavior of this.behaviours) {
      if (!handled) handled = behavior.handleKeyDown(e)
    }
    if (handled) e.target?.dispatchEvent(new Event("input", { bubbles: true }))
  }

  private highlightCode() {
    this.highlighted = Prism.highlight(this.input, Prism.languages["kotlin"], "kotlin")
  }

  connectedCallback(): void {
    this.addEventListener("mousedown", evt => {
      // relay mousedown events that are dispatched from the tapdrag layer to the outer component
      if (evt.isTrusted) return
      // the dispatched event will be ignored by the textarea, so we have to set the selection and focus manually
      this.textareaRef.value?.dispatchEvent(new MouseEvent(evt.type, { ...evt, bubbles: false }))
      const selection = this.approximateCaretPosition(
        this.textareaRef.value!,
        evt.clientX,
        evt.clientY
      )
      this.textareaRef.value!.setSelectionRange(selection, selection)
      this.textareaRef.value!.focus()
      evt.stopPropagation()
    })
    super.connectedCallback()
  }

  /**
   * Approximates the text selection index in a textarea
   * This is needed because, for security reasons, inputs ignore non-trusted events
   * @param textarea - The textarea HTML element
   * @param x - The X coordinate relative to the viewport
   * @param y - The Y coordinate relative to the viewport
   * @returns The approximate index position in the text
   */
  private approximateCaretPosition(textarea: HTMLTextAreaElement, x: number, y: number): number {
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
