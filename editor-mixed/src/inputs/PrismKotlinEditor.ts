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
import { ref } from "lit/directives/ref.js"
import { EscapeFocusBehavior } from "./EscapeFocusBehavior"
import { BaseInputElement } from "./BaseInputElement"

@customElement("prism-kotlin-editor")
export class PrismKotlinEditor extends BaseInputElement {
  declare highlighted: string

  static properties = {
    input: { type: String },
    highlighted: { type: String, state: true },
  }

  constructor() {
    super()
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
      textarea.input {
        background: transparent;
        color: transparent;
        caret-color: white;
      }
      pre.highlighted {
        pointer-events: none;
      }
    `,
    ...super.styles,
  ]

  render() {
    return html`
      <div class="container">
        <pre class="highlighted language-kotlin"><code>${unsafeHTML(this.highlighted)}</code></pre>
        <textarea
          ${ref(this.inputRef)}
          class="input"
          .value=${this.input}
          @input=${this.handleInput}
          @keydown=${this.handleKeyDown}
          spellcheck="false"></textarea>
      </div>
    `
  }

  updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("input")) {
      this.highlightCode()
    }
  }

  onInput(_: Event): void {
    this.highlightCode()
  }

  private highlightCode() {
    this.highlighted = Prism.highlight(this.input, Prism.languages["kotlin"], "kotlin")
  }
}
