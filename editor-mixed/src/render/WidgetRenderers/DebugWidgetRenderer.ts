import { html, svg, type TemplateResult } from "lit"
import { BaseWidgetRenderer, type Widget } from "./BaseWidgetRenderer"

export class DebugWidgetRenderer extends BaseWidgetRenderer {
  containerPadding = { top: 5, right: 0, bottom: 0, left: 0 }

  renderSelectorWidget(widget: Widget): TemplateResult<1> {
    return html`
      <div style="display: flex; flex-direction: column; gap: 0.25rem; padding: 4%;" role="list" id="testme">
        ${widget.options.map(
          option => html`
            <button
              class="${option.id === widget.selected ? "selected" : ""}"
              @click="${() => {
                this.removeWidget()
                widget.onSelected(option.id)
              }}"
              role="listitem">
              ${option.display}
            </button>
          `
        )}
      </div>
      <style>
        button {
          background-color: transparent;
          font-family: monospace;
          line-height: 1.5;
          border: none;
          text-align: start;
          padding: 0.5rem;
          border-radius: 0.3rem;
        }
        button.selected {
          background-color: #be93fe;
        }
        button:hover {
          background-color: lightblue;
        }
      </style>
    `
  }

  protected renderWidgetBackground(): TemplateResult<2> {
    return svg`
    <polygon points="0,5 5,0 10,5, 100,5, 100,100, 0,100" fill="#fff" stroke="black" stroke-width="1" />
    `
  }
}
