// PrismLitEditor.ts
import { LitElement, css, html, unsafeCSS } from "lit"
import { customElement } from "lit/decorators.js"
import { unsafeHTML } from "lit/directives/unsafe-html.js"
import Prism from "prismjs"

import { ref, type Ref } from "lit/directives/ref.js"
import "prismjs/components/prism-kotlin"
import "prismjs/plugins/match-braces/prism-match-braces"
import themeStyles from "prismjs/themes/prism-okaidia.css?inline"
import prismStyles from "prismjs/themes/prism.css?inline"
import type { Behavior } from "./Behavior"
import { BracesBehavior } from "./BracesBehavior"
import { EscapeFocusBehavior } from "./EscapeFocusBehavior"
import { IndentationBehavior } from "./IndentationBehavior"
import { QuotesBehavior } from "./QuotesBehavior"

@customElement("prism-kotlin-editor")
export class PrismKotlinEditor extends LitElement {
  
  declare value: string
  declare reference: Ref<HTMLTextAreaElement>
  declare highlighted: string
  declare disableFocus: boolean

  static properties = {
    value: { type: String },
    reference: { type: Object },
    input: { type: String },
    highlighted: { type: String, state: true },
  }

  constructor() {
    super()
    this.value = ""
    this.highlighted = ""
  }

  behaviors: Behavior[] = [
    new EscapeFocusBehavior(),
    new BracesBehavior(),
    new IndentationBehavior(),
    new QuotesBehavior(),
  ]

  static styles = [
    unsafeCSS(prismStyles),
    unsafeCSS(themeStyles),
    css`
      :host {
        display: block;
        /* overflow: auto; */
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
        min-width: 100%;
        min-height: 100%;
        box-sizing: border-box;
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
        background: transparent;
        color: transparent;
        caret-color: white;
        position: absolute;
        top: 0;
        left: 0;
        resize: none;
        outline: none;
        overflow: hidden;
      }
      pre.highlighted {
        pointer-events: none;
      }
    `,
  ]

  render() {
    return html`
      <div class="container">
        <pre class="highlighted language-kotlin"><code>${unsafeHTML(this.highlighted)}</code></pre>
        <textarea
          ${ref(this.reference)}
          tabindex=${this.disableFocus ? -1 : 0}
          class="input"
          .value=${this.value}
          @mousedown=${console.log}
          @input=${this.handleInput}
          @keydown=${this.handleKeyDown}
          spellcheck="false"></textarea>
      </div>
    `
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("value")) {
      this.highlightCode()
    }
  }

  onInput(_: Event): void {
    this.highlightCode()
  }

  private highlightCode() {
    this.highlighted = Prism.highlight(this.value, Prism.languages["kotlin"], "kotlin")
  }

  protected handleInput(e: Event) {
    this.value = (e.target as HTMLInputElement | HTMLTextAreaElement).value || ""
    this.dispatchEvent(new CustomEvent("input-change", { detail: { input: this.value } }))
    this.onInput(e)
  }

  protected handleKeyDown(e: KeyboardEvent) {
    let handled = false
    for (const behavior of this.behaviors) {
      if (!handled) handled = behavior.handleKeyDown(e)
    }
    if (handled) e.target?.dispatchEvent(new Event("input", { bubbles: true }))
  }
}
