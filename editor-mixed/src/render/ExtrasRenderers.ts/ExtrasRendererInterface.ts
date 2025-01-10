import type { TemplateResult } from "lit";
import type { PanZoomHelper } from "../../panzoom/PanZoomHelper";

/**
 * ExtrasRenderers render some additional elements for the editor
 */
export interface ExtrasRendererInterface {
  /**
   * Render the workspace background
   */
  renderBackground(): TemplateResult<2>
  renderZoomButtons(panzoom: PanZoomHelper | undefined): TemplateResult<1>
}
