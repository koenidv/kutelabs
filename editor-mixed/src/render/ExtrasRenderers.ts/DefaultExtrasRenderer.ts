import { html, svg, type TemplateResult } from "lit"
import type { ExtrasRendererInterface } from "./ExtrasRendererInterface"
import type { PanZoomHelper } from "../../panzoom/PanZoomHelper"
import { guard } from "lit/directives/guard.js"

export class ExtrasRenderer implements ExtrasRendererInterface {
  renderBackground(): TemplateResult<2> {
    return guard(
      null,
      () => svg`
    <pattern
      id="pattern-circles"
      x="0"
      y="0"
      width="50"
      height="50"
      patternUnits="userSpaceOnUse"
      patternContentUnits="userSpaceOnUse">
      <circle id="pattern-circle" cx="24.2" cy="24.2" r="1.6" fill="#00000032"></circle>
    </pattern>
    <rect id="workspace-background" id="rect" x="-500%" y="-500%" width="1000%" height="1000%" fill="url(#pattern-circles)"></rect>
  `
    ) as TemplateResult<2>
  }

  renderZoomButtons(panzoom: PanZoomHelper | undefined): TemplateResult<1> {
    return guard(null, () => html`
      <div style="display: flex; flex-direction: column; padding: 0 0.5rem 0.5rem 0; gap: 0.25rem;">
        <div
          id="control-zoom-larger"
          class="control-zoom"
          @mousedown=${(e: MouseEvent) => {
            panzoom?.zoomStep(-10)
            e.preventDefault()
          }}
          @touchstart=${(e: TouchEvent) => {
            panzoom?.zoomStep(-10)
            e.preventDefault()
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key == "Enter") {
              panzoom?.zoomStep(-10)
              e.preventDefault()
            }
          }}
          role="button"
          aria-label="Increase workspace zoom"
          tabindex="0">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
              d="M12 19V5m7 7H5" />
          </svg>
        </div>
        <div
          id="control-zoom-smaller"
          class="control-zoom"
          @mousedown=${(e: MouseEvent) => {
            panzoom?.zoomStep(10)
            e.preventDefault()
          }}
          @touchstart=${(e: TouchEvent) => {
            panzoom?.zoomStep(10)
            e.preventDefault()
          }}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key == "Enter") {
              panzoom?.zoomStep(10)
              e.preventDefault()
            }
          }}
          role="button"
          aria-label="Decrease workspace zoom"
          tabindex="0">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
              d="M18 12H6" />
          </svg>
        </div>
        <style>
          .control-zoom {
            height: 2.25rem;
            width: 2.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1.5px solid #808080;
            border-radius: 100%;
            background-color: #ffffffa0;
          }
          .control-zoom:hover {
            background-color: #dfdfdf;
            cursor: pointer;
          }
        </style>
      </div>
    `) as TemplateResult<1>
  }
}
