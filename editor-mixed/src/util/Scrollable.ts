import { LitElement, svg, html, css, nothing } from "lit"
import { customElement, property, state } from "lit/decorators.js"

@customElement("scrollable-svg")
export class ScrollableGroup extends LitElement {
  static styles = css`
    /* Optional styling if required */
  `

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this
  }

  // Configurable properties for scroll sensitivity
  @property({ type: Number }) scrollSensitivityX = 1
  @property({ type: Number }) scrollSensitivityY = 1

  // Internal offset states for x and y axes
  @state() private offsetX = 0
  @state() private offsetY = 0

  // Apply scroll offsets based on wheel input
  private handleScroll(event: WheelEvent) {
    event.preventDefault()
    this.offsetX += event.deltaX * this.scrollSensitivityX
    this.offsetY += event.deltaY * this.scrollSensitivityY
    this.requestUpdate()
  }

  connectedCallback() {
    super.connectedCallback()
    this.addEventListener("wheel", this.handleScroll)
  }

  disconnectedCallback() {
    this.removeEventListener("wheel", this.handleScroll)
    super.disconnectedCallback()
  }

  render() {
    return html`
      <svg width="100%" height="100%">
        <!-- Clip path defines the scrollable area for the <g> -->
        <defs>
          <clipPath id="scrollClip">
            <rect x="0" y="0" width="400" height="300"></rect>
          </clipPath>
        </defs>

        <!-- Scrollable <g> with transform applied -->
        <g 
          clip-path="url(#scrollClip)" 
          transform="translate(${this.offsetX}, ${this.offsetY})"
        >
        <text x="10" y="20" width="50" height="50">Scrollable SVG</text>
          <!-- Slot allows for custom content to be placed inside the scrollable area -->
          <slot></slot>
        </g>
      </svg>
    `
  }
}
