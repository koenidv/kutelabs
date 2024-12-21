import { customElement } from "lit/decorators.js"
import { BaseInputElement } from "./BaseInputElement"
import { html, type TemplateResult } from "lit"
import type { Behavior } from "./Behavior"
import { ref } from "lit/directives/ref.js"

@customElement("value-input")
export class SimpleInputElement extends BaseInputElement {
  behaviors: Behavior[] = []

  render(): TemplateResult<1> {
    return html`
          <div class="container">
      <input
        ${ref(this.inputRef)}
        class="input"
        .value=${this.input}
        @input=${this.handleInput}
        @keydown=${this.handleKeyDown}
        spellcheck="false" />
        </div>
    `
  }
}
