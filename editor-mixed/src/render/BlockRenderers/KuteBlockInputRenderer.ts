import { type TemplateResult, html } from "lit"
import { type Ref, ref } from "lit/directives/ref.js"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { BaseBlockInputRenderer } from "./BaseBlockInputRenderer"

export class KuteBlockInputRenderer extends BaseBlockInputRenderer {
  protected renderInputCode(
    { block }: AnyRegisteredBlock,
    value: string,
    onChange: (value: string) => void,
    singleLine: boolean,
    reference: Ref<HTMLTextAreaElement> | undefined
  ): TemplateResult<1> {
    return html`
      <prism-kotlin-editor
        .value=${value}
        .reference=${reference}
        .disableFocus=${block.isInDrawer}
        .inDrawer=${block.isInDrawer}
        .singleLine=${singleLine}
        @input-change=${(e: CustomEvent) => onChange(e.detail.input)}>
      </prism-kotlin-editor>
  </div>
    `
  }

  protected renderInputString(
    value: string,
    onChange: (value: string) => void,
    onKeydown?: (e: KeyboardEvent) => void,
    placeholder?: string,
    reference?: Ref<HTMLInputElement> | undefined,
    textScaling?: number
  ): TemplateResult<1> {
    return html`
      <input
        ${ref(reference)}
        value=${value}
        placeholder=${placeholder ?? "text"}
        type="text"
        tabindex="-1"
        style="width: 100%; height: 100%; box-sizing: border-box; font-family: monospace; font-size: ${13 *
        (textScaling ??
          1)}px; font-weight: normal; line-height: 1.5; padding: 0; margin: 0; border: none; outline: none; resize: none; overflow: hidden; border-radius: 6px;"
        @input=${(e: InputEvent) => onChange((e.target as HTMLInputElement).value)}
        @keydown=${onKeydown}
        spellcheck="false" />
    `
  }

  protected override renderInputBoolean(
    value: boolean,
    onChange?: (value: boolean) => void
  ): TemplateResult<1> {
    return html`
      <div
        @mousedown=${() => onChange?.(!value)}
        @touchstart=${() => onChange?.(!value)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") onChange?.(!value)
        }}
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
    _values: { id: string; display: string }[],
    selected: string
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
  }
}
