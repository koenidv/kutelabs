import { isSafari } from "../../util/browserCheck"
import type { BaseWidgetRenderer } from "../WidgetRenderers/BaseWidgetRenderer"

export abstract class PropertiesBlockRenderer {
  protected readonly setWidget: typeof BaseWidgetRenderer.prototype.setWidget
  /* Request a complete update of the editor */
  protected readonly requestUpdate: () => void

  /* Because Safari doesn't apply viewBox scaling to foreignObject elements, we need to apply a workaround*/
  protected _workspaceScaleFactor = 1
  /** additional classes to apply, will hold scale information for safari */
  protected _safariTransform = isSafari ? `position: fixed;` : ""
  protected _safariFixOnly = isSafari ? `position: fixed;` : ""
  /**
   * Set the current workspace scaling factor
   * @param value scaling factor, higher values mean zoomed in, lower values mean zoomed out
   */
  public setWorkspaceScaleFactor(value: number) {
    this._workspaceScaleFactor = value
    this._safariTransform = isSafari
      ? `position: fixed; transform: scale(${(1 / this._workspaceScaleFactor)}); transform-origin: 0 0;`
      : ""
  }

  constructor(setWidget: typeof BaseWidgetRenderer.prototype.setWidget, requestUpdate: () => void) {
    this.setWidget = setWidget
    this.requestUpdate = requestUpdate
    if (isSafari)
      setTimeout(() => {
        this.setWorkspaceScaleFactor(1)
        requestUpdate()
      }, 0)
  }
}
