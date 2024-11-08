// PrismLitEditor.ts
import { LitElement, html, css, unsafeCSS } from "lit"
import { customElement } from "lit/decorators.js"
import { unsafeHTML } from "lit/directives/unsafe-html.js"
import Prism from "prismjs"

import "prismjs/components/prism-kotlin"
import prismStyles from "prismjs/themes/prism.css?inline"
import themeStyles from "prismjs/themes/prism-okaidia.css?inline"

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

  static styles = [
    unsafeCSS(prismStyles),
    unsafeCSS(themeStyles),
    css`
      :host {
        display: block;
      }
      pre {
        margin: 0;
        padding: 10px;
        white-space: pre-wrap;
      }
      code {
        outline: none;
        min-height: 1em;
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
      <pre class="language-kotlin">
        <code class="editor language-kotlin" @input=${this.handleInput} contenteditable="true">
          ${unsafeHTML(this.highlighted)}
        </code>
      </pre>
    `
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLElement
    const input = target.textContent || ""
    this.input = input
    this.dispatchEvent(
      new CustomEvent("code-change", { detail: { code: input } })
    )
    this.highlightCode()
  }

  private highlightCode() {
    this.highlighted = Prism.highlight(
      this.input,
      Prism.languages["kotlin"],
      "kotlin"
    )
    console.log(this.highlighted)
    this.requestUpdate()
  }
}
