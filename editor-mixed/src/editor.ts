import { html, LitElement } from "lit"
import { customElement, property } from "lit/decorators.js"

@customElement("editor-mixed")
export class EditorMixed extends LitElement {
  function(dies: string) {
    return ""
  }

  @property()
  name: string = "Somebody"

  render() {
    return html`<p>Hello, ${this.name}!</p>`
  }
}
