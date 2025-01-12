import { type TemplateResult, html } from "lit"
import { type Ref, ref } from "lit/directives/ref.js"
import type { SimpleDataType, TsTypeByDataType } from "../../blocks/configuration/DataType"
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
    editable?: boolean,
    onKeydown?: (e: KeyboardEvent) => void,
    placeholder?: string,
    reference?: Ref<HTMLInputElement> | undefined,
    textScaling?: number
  ): TemplateResult<1> {
    return html`
      <input
        ${reference ? ref(reference) : ""}
        value=${value}
        placeholder=${placeholder ?? "text"}
        type="text"
        tabindex="${editable ? "0" : "-1"}"
        style="width: 100%; height: 100%; box-sizing: border-box; font-family: monospace; font-size: ${13 *
        (textScaling ??
          1)}px; font-weight: normal; line-height: 1.5; padding: 0; margin: 0; border: none; outline: none; resize: none; overflow: hidden; border-radius: 6px;"
        @input=${(e: InputEvent) => editable && onChange((e.target as HTMLInputElement).value)}
        @keydown=${onKeydown}
        spellcheck="false" />
    `
  }

  protected override renderInputBoolean(
    value: boolean,
    onChange?: (value: boolean) => void,
    editable?: boolean
  ): TemplateResult<1> {
    const toggleValue = (e: Event) => {
      if (editable) {
        onChange?.(!value)
        e.preventDefault()
      }
    }

    return html`
      <div
        @mousedown=${toggleValue}
        @touchstart=${toggleValue}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") toggleValue(e)
        }}
        style="width: 100%; height: 100%; display: flex; padding: 0 8px; justify-content: start; align-items: center; background-color: white; border-radius: 6px;"
        role="button"
        tabindex=${editable ? "0" : "-1"}>
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

  protected renderArrayTarget<T extends SimpleDataType>(
    type: T,
    value?: TsTypeByDataType<T>[]
  ): TemplateResult<1> {
    let itemText
    switch (type) {
      case "string":
        itemText = "string"
        break
      case "int":
        itemText = "integer"
        break
      case "float":
        itemText = "number"
        break
      case "boolean":
        itemText = "boolean"
        break
    }
    return html`
      <div
        style="width: 100%; height: 100%; display: flex; justify-content: space-between; align-items: center; background-color: white; border-radius: 6px;">
        <p style="font-family: monospace; font-size: 14px; font-weight: normal; padding-left: 4px;">
          ${value ? value.length + " " : ""}${itemText}${value?.length === 1 ? "" : "s"}
        </p>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          style="padding-right: 4px;">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </div>
    `
  }
}
