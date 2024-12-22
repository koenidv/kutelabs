import { html, svg, type TemplateResult } from "lit"
import { BaseWidgetRenderer, type Widget } from "./BaseWidgetRenderer"

export class DebugWidgetRenderer extends BaseWidgetRenderer {
  containerPadding = { top: 9, right: 4, bottom: 4, left: 4 }

  renderSelectorWidget(widget: Widget): TemplateResult<1> {
    return html`
      <div>
        ${widget.options.map(option => html`<div>${option.display}</div>`)}
      </div>
    `
  }

  protected renderWidgetBackground(): TemplateResult<2> {
    return svg`
    <polygon points="0,5 5,0 10,5, 100,5, 100,100, 0,100" fill="#fff" stroke="black" stroke-width="1" />
    `
  }
}
