// PrismLitEditor.ts
import { LitElement, html, css, unsafeCSS } from "lit"
import { customElement } from "lit/decorators.js"
import { unsafeHTML } from "lit/directives/unsafe-html.js"
import Prism from "prismjs"

import "prismjs/components/prism-kotlin"
import prismStyles from "prismjs/themes/prism.css?inline"
import themeStyles from "prismjs/themes/prism-okaidia.css?inline"
import "prismjs/plugins/match-braces/prism-match-braces"
import { createRef, ref, type Ref } from "lit/directives/ref.js"
import { IndentationBehavior } from "./IndentationBehavior"
import { BracesBehavior } from "./BracesBehavior"
import type { Behavior } from "./Behavior"

@customElement("prism-kotlin-editor")
export class PrismKotlinEditor extends LitElement {
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

  behaviours: Behavior[] = [new BracesBehavior(), new IndentationBehavior()]

  static styles = [
    unsafeCSS(prismStyles),
    unsafeCSS(themeStyles),
    css`
      :host {
        display: block;
        position: relative;
      }
      pre {
        margin: 0;
        padding: 10px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      textarea.input,
      pre.highlighted {
        font-family: monospace;
        font-size: 14px;
        line-height: 1.5;
        tab-size: 2;
        padding: 0;
        margin: 0;
        width: 100%;
        height: 100%;
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
        overflow: auto;
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
      <pre class="highlighted language-kotlin"><code>${unsafeHTML(
        this.highlighted
      )}</code></pre>
      <textarea
        class="input"
        .value=${this.input}
        @input=${this.handleInput}
        @keydown=${this.handleKeyDown}
        spellcheck="false"></textarea>
    `
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    this.input = target.value || ""
    this.dispatchEvent(
      new CustomEvent("code-change", { detail: { code: this.input } })
    )
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
    this.highlighted = Prism.highlight(
      this.input,
      Prism.languages["kotlin"],
      "kotlin"
    )
  }
}
