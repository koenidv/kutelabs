import { svg, type TemplateResult } from "lit";

export class ExtrasRenderer {
  renderBackground(): TemplateResult<2> {
    return svg`
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
    <rect id="rect" x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)"></rect>
  `
  }
}