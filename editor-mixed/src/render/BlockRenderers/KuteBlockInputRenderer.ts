import { type TemplateResult, html } from "lit"
import { type Ref, ref } from "lit/directives/ref.js"
import type { SimpleDataType, TsTypeByDataType } from "../../blocks/configuration/DataType"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { BaseBlockInputRenderer } from "./BaseBlockInputRenderer"
import { Coordinates } from "../../util/Coordinates"
import { BlockInputIcon } from "./InputIcon"

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
    value: string | null,
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
        value=${value ?? ""}
        placeholder=${placeholder ?? "text"}
        type="text"
        tabindex="${editable ? "0" : "-1"}"
        style="width: 100%; height: 100%; box-sizing: border-box; font-family: monospace; font-size: ${13 *
        (textScaling ??
          1)}px; font-weight: normal; line-height: 1.5; padding: 0; margin: 0; border: none; outline: none; resize: none; overflow: hidden; border-radius: 6px; padding: 0 4px;"
        @input=${(e: InputEvent) => editable && onChange((e.target as HTMLInputElement).value)}
        @keydown=${onKeydown}
        spellcheck="false" />
    `
  }

  protected renderInputButton(
    value: string | { label: string },
    editable: boolean = true,
    onClick?: (e: Event) => void,
    reference?: Ref<HTMLElement> | undefined,
    iconStart?: BlockInputIcon
  ): TemplateResult<1> {
    const clickHandler = (e: Event) => {
      if (editable) {
        onClick?.(e)
        e.preventDefault()
      }
    }
    return html`
      <div
        ${reference ? ref(reference) : ""}
        @mousedown=${clickHandler}
        @touchstart=${clickHandler}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") clickHandler(e)
        }}
        style="width: 100%; height: 100%; display: flex; gap: 2px; justify-content: center; align-items: center; background-color: white; border-radius: 6px; ${editable
          ? "cursor: pointer;"
          : ""}"
        role="button"
        aria-label="${typeof value === "object" && "label" in value ? value.label : ""}"
        tabindex=${editable ? "0" : "-1"}>
        ${iconStart ? this.renderIcon(iconStart, new Coordinates(16, 16)) : ""}
        ${typeof value == "string"
          ? html`<p style="font-family: monospace; font-size: 13px; font-weight: normal;">
              ${value}
            </p>`
          : ""}
      </div>
    `
  }

  protected override renderInputBoolean(
    value: boolean,
    onChange?: (value: boolean) => void,
    editable?: boolean
  ): TemplateResult<1> {
    return this.renderInputButton(value ? "✅ Yes" : "❌ No", editable, () => onChange?.(!value))
  }

  protected override renderInputNumber(
    value: number | null,
    onChange: (value: number, skipUpdate?: boolean) => void,
    editable?: boolean,
    isFloat?: boolean,
    placeholder?: string,
    reference?: Ref<HTMLInputElement> | undefined,
    textScaling?: number
  ): TemplateResult<1> {
    const decrease = (e: Event) => {
      if (editable) {
        onChange((value ?? 0) - (isFloat ? 0.1 : 1), false)
        e.preventDefault()
      }
    }
    const increase = (e: Event) => {
      if (editable) {
        onChange((value ?? 0) + (isFloat ? 0.1 : 1), false)
        e.preventDefault()
      }
    }
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") increase(e)
      if (e.key === "ArrowDown") decrease(e)
      if (
        !(isFloat ? /[0-9.]/ : /[0-9]/).test(e.key) &&
        !["Backspace", "Delete", "Tab"].includes(e.key)
      ) {
        e.preventDefault()
      }
      if (e.key === "." && (e.target as HTMLInputElement).value.includes(".")) e.preventDefault()
    }
    const onInput = (e: InputEvent) => {
      if (!editable) return
      const newValue = (e.target as HTMLInputElement).value
      if (newValue === "" || (isFloat ? /^-?\d*\.?\d*$/ : /^-?\d*$/).test(newValue)) {
        onChange(newValue === "" ? 0 : isFloat ? parseFloat(newValue) : parseInt(newValue), true)
      }
    }
    return html`
      <div
        style="display: flex; flex-direction: row; height: 100%; width: 100%; background-color: white; border-radius: 6px;">
        <input
          ${reference ? ref(reference) : ""}
          value=${value ?? ""}
          placeholder=${placeholder ?? "text"}
          type="text"
          inputmode=${isFloat ? "decimal" : "numeric"}
          tabindex="${editable ? "0" : "-1"}"
          style="width: 100%; height: 100%; box-sizing: border-box; font-family: monospace; font-size: ${13 *
          (textScaling ??
            1)}px; font-weight: normal; line-height: 1.5; padding: 0; margin: 0; border: none; outline: none; resize: none; overflow: hidden; border-radius: 6px; padding: 0 4px;"
          @keydown=${onKeydown}
          @input=${onInput}
          spellcheck="false" />
        ${editable
          ? html` <button
                class="edit-value-decrease"
                style="background: transparent; border: none; padding: 0; margin: 0; outline: none; cursor: pointer; display: flex; justify-content: center; align-items: center;"
                @pointerdown=${decrease}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === "Enter") decrease(e)
                }}
                tabindex="${editable ? "0" : "-1"}"
                aria-label="Decrease value">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="${20 * (textScaling ?? 1)}"
                  height="${24 * (textScaling ?? 1)}"
                  viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" d="M16 12H8" />
                    <path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" />
                  </g>
                </svg>
              </button>
              <button
                class="edit-value-increase"
                style="background: transparent; border: none; padding: 0; margin: 0; outline: none; cursor: pointer; display: flex; justify-content: center; align-items: center;"
                @pointerdown=${increase}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === "Enter") increase(e)
                }}
                tabindex="${editable ? "0" : "-1"}"
                aria-label="Increase value">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="${20 * (textScaling ?? 1)}"
                  height="${24 * (textScaling ?? 1)}"
                  viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" d="M12 16V8m4 4H8" />
                    <path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" />
                  </g>
                </svg>
              </button>`
          : ""}
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
        itemText = "number"
        break
      case "float":
        itemText = "decimal"
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

  protected override renderIcon(icon: BlockInputIcon, size: Coordinates): TemplateResult<1> {
    switch (icon) {
      case BlockInputIcon.Add:
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          width="${size.x}"
          height="${size.y}"
          viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
            d="M12 19V5m7 7H5" />
        </svg>`
      case BlockInputIcon.Remove:
        return html`<svg
          xmlns="http://www.w3.org/2000/svg"
          width="${size.x}"
          height="${size.y}"
          viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
            d="M18 12H6" />
        </svg>`
    }
  }
}
