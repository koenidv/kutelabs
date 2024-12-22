import { html, noChange, nothing, type TemplateResult } from "lit"
import { Coordinates } from "../../util/Coordinates"
import type { Ref } from "lit/directives/ref.js"

export type SelectorWidget = {
  type: "selector"
  options: { id: string; display: string }[]
  selected: string
  onSelected: (id: string) => boolean
}

export type Widget = SelectorWidget

export abstract class BaseWidgetRenderer {
  private readonly requestUpdate: () => void
  private readonly workspaceRef: Ref<SVGSVGElement>

  private displayedWidget: Widget | null = null
  private position: Coordinates = Coordinates.zero
  private dirty = false

  constructor(workspaceRef: Ref<SVGSVGElement>, requestUpdate: () => void) {
    this.workspaceRef = workspaceRef
    this.requestUpdate = requestUpdate
  }

  public setWidget(widget: Widget | null, clientPosition: Coordinates) {
    this.displayedWidget = widget
    this.position = clientPosition
    this.dirty = true
    this.requestUpdate()
  }

  public removeWidget() {
    if (this.displayedWidget == null) return
    this.displayedWidget = null
    this.dirty = true
    this.requestUpdate()
  }

  public render(): TemplateResult<1> | typeof noChange | typeof nothing {
    if (!this.dirty) return noChange
    this.dirty = false
    if (this.displayedWidget) {
      const screenPos = this.position.toScreenCoordinates(this.workspaceRef.value!)
      return html`
        <div
          style="background: green; position: absolute;left: ${screenPos.x}px; top: ${screenPos.y}px;">
          ${this.renderWidget(this.displayedWidget)}
        </div>
      `
    }
    return nothing
  }

  protected abstract renderWidget(widget: Widget): TemplateResult<1>
}

export type WidgetRendererConstructorType = {
  new (workspaceRef: Ref<SVGSVGElement>, requestUpdate: () => void): BaseWidgetRenderer
}
