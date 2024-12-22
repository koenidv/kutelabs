import { html, noChange, nothing, type TemplateResult } from "lit"
import { Coordinates } from "../../util/Coordinates"
import { createRef, ref, type Ref } from "lit/directives/ref.js"
import { FocusTrap } from "../../util/FocusTrap"

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

  private readonly widgetRef = createRef<HTMLElement>()
  private readonly focusTrap = new FocusTrap(this.widgetRef, this.removeWidget.bind(this))

  private displayedWidget: Widget | null = null
  private position: Coordinates = Coordinates.zero
  private dirty = false

  abstract containerPadding: { top: number; right: number; bottom: number; left: number }

  constructor(workspaceRef: Ref<SVGSVGElement>, requestUpdate: () => void) {
    this.workspaceRef = workspaceRef
    this.requestUpdate = requestUpdate
  }

  public setWidget(widget: Widget , clientPosition: Coordinates) {
    this.displayedWidget = widget
    this.position = clientPosition
    this.dirty = true
    this.requestUpdate()
    this.focusTrap.activate()
  }

  public removeWidget() {
    if (this.displayedWidget == null) return
    this.displayedWidget = null
    this.dirty = true
    this.focusTrap.deactivate()
    this.requestUpdate()
  }

  public render(): TemplateResult<1> | typeof noChange | typeof nothing {
    if (!this.dirty) return noChange
    this.dirty = false
    if (this.displayedWidget) {
      const screenPos = this.position.toScreenCoordinates(this.workspaceRef.value!)
      const widgetSize = new Coordinates(200, 200)
      return html`
        <div
          ${ref(this.widgetRef)}
          style="position: absolute; left: ${screenPos.x}px; top: ${screenPos.y}px;"
          @mousedown="${(e: MouseEvent) => e.preventDefault()}"
          @touchstart="${(e: TouchEvent) => e.preventDefault()}">
          <svg
            style="position: absolute; top: 0; left: 0;"
            width=${widgetSize.x}
            height=${widgetSize.y}
            viewBox="0 0 100 100">
            ${this.renderWidgetBackground()}Ì
          </svg>
          <div
            style="position: relative; padding: ${this.containerPadding.top}% ${this
              .containerPadding.right}% ${this.containerPadding.bottom}% ${this.containerPadding
              .left}%; box-sizing: border-box; width: ${widgetSize.x}px; height: ${widgetSize.y}px">
            <div style="overflow-y: auto; overflow-x: hidden; width: 100%; height: 100%;">
              ${this.renderWidget(this.displayedWidget)}
            </div>
          </div>
        </div>
      `
    }
    return nothing
  }

  private renderWidget(widget: Widget): TemplateResult<1> {
    switch (widget.type) {
      case "selector":
        return this.renderSelectorWidget(widget)
    }
  }

  protected abstract renderSelectorWidget(widget: Widget): TemplateResult<1>
  protected abstract renderWidgetBackground(): TemplateResult<2>
}

export type WidgetRendererConstructorType = {
  new (workspaceRef: Ref<SVGSVGElement>, requestUpdate: () => void): BaseWidgetRenderer
}
