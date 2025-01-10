import { type TemplateResult, html } from "lit"
import { type Ref, ref } from "lit/directives/ref.js"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import { BaseBlockInputRenderer } from "./BaseBlockInputRenderer"
import type { InternalBlockRenderProps } from "./BlockRendererTypes"

export class KuteBlockInputRenderer extends BaseBlockInputRenderer {
  protected renderInputCode(
    { block }: AnyRegisteredBlock,
    _size: Coordinates,
    value: string,
    onChange: (value: string) => void,
    reference: Ref<HTMLTextAreaElement> | undefined,
    _props: InternalBlockRenderProps
  ): TemplateResult<1> {
    return html`
      <prism-kotlin-editor
        .value=${value}
        .reference=${reference}
        .inDrawer=${block.isInDrawer}
        @input-change=${(e: CustomEvent) => onChange(e.detail.input)}>
      </prism-kotlin-editor>
    `
  }

  protected renderInputString(
    _registered: AnyRegisteredBlock,
    _size: Coordinates,
    value: string,
    onChange: (value: string) => void,
    onKeydown: (e: KeyboardEvent) => void,
    reference: Ref<HTMLInputElement> | undefined,
    _props: InternalBlockRenderProps
  ): TemplateResult<1> {
    return html`
      <input
        ${ref(reference)}
        value=${value}
        type="text"
        tabindex="-1"
        style="width: 100%; height: 100%; box-sizing: border-box; font-family: monospace; font-size: 14px; font-weight: normal; line-height: 1.5; padding: 0; margin: 0; border: none; outline: none; resize: none; overflow: hidden; border-radius: 6px;"
        @input=${(e: InputEvent) => onChange((e.target as HTMLInputElement).value)}
        @keydown=${onKeydown}
        spellcheck="false" />
    `
  }

  protected override renderInputBoolean(
    _registered: AnyRegisteredBlock,
    _size: Coordinates,
    value: boolean,
    _props: InternalBlockRenderProps
  ): TemplateResult<1> {
    return html`
      <div
        style="width: 100%; height: 100%; display: flex; padding: 0 8px; justify-content: start; align-items: center; background-color: white; border-radius: 6px;"
        role="button"
        tabindex="-1">
        <p style="font-family: monospace; font-size: 14px; font-weight: normal;">
          ${value ? "✅ Yes" : "❌ No"}
        </p>
      </div>
    `
  }

  protected override renderInputSelector(
    _registered: AnyRegisteredBlock,
    _size: Coordinates,
    _values: { id: string; display: string }[],
    selected: string,
    _props: InternalBlockRenderProps
  ): TemplateResult<1> {
    return html`
      <div
        style="width: 100%; height: 100%; display: flex; justify-content: start; align-items: center; background-color: white; border-radius: 6px; overflow: hidden;">
        <div style="padding: 0 2px 0 4px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
            <path
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
              d="m5 10l7 7l7-7" />
          </svg>
        </div>
        <p style="font-family: monospace; font-size: 14px; font-weight: normal;">${selected}</p>
      </div>
    `

    // return svg`
    // <g
    //   transform="${`translate(${position.x}, ${position.y})`}"
    //   role="button"
    //   tabindex=${++props.tabindex}
    //   style="cursor: pointer;"
    //   @mousedown="${(e: Event) => !block.isInDrawer && showDropdown(e)}"
    //   @touchstart="${(e: Event) => !block.isInDrawer && showDropdown(e)}"
    //   @keydown="${(e: KeyboardEvent) => {
    //     if (e.key === "Enter" || e.key === " ") showDropdown(e)
    //   }}"
    //   >
    //   <rect width=${size.x} height=${size.y} fill="white" stroke="black" stroke-width="1" rx="6"/>
    //   <text x="5" y="${size.y / 2 + 6}">${selected}</text>
    //   </g>
    // `
  }
}
