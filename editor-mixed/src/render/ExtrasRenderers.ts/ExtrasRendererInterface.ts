import type { TemplateResult } from "lit";

/**
 * ExtrasRenderers render some additional elements for the editor
 */
export interface ExtrasRendererInterface {
  /**
   * Render the workspace background
   */
  renderBackground(): TemplateResult<2>
}
