import { html, type TemplateResult } from "lit"
import { BaseWidgetRenderer, type Widget } from "./BaseWidgetRenderer"

export class DebugWidgetRenderer extends BaseWidgetRenderer {
  renderWidget(widget: Widget): TemplateResult<1> {
    return html`
      <div>
        <pre>${JSON.stringify(widget, null, 2)}</pre>
      </div>
    `
  }
}
