import { html, type TemplateResult } from "lit"
import { customElement } from "lit/decorators.js"
import { ref } from "lit/directives/ref.js"
import { BaseInputElement } from "./BaseInputElement"
import type { Behavior } from "./Behavior"

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
