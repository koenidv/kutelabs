import { html, svg, type TemplateResult } from "lit"
import {
  BaseWidgetRenderer,
  type EditListWidget,
  type OverlayWidget,
  type SelectorWidget,
  type Widget,
} from "./BaseWidgetRenderer"
import { RectBuilder } from "../../svg/RectBuilder"
import type { SimpleDataType, TsTypeByDataType } from "../../blocks/configuration/DataType"

export class KuteWidgetRenderer extends BaseWidgetRenderer {
  containerPadding = { top: 2.75, right: 0, bottom: 0, left: 0 }

  renderSelectorWidget(widget: SelectorWidget): TemplateResult<1> {
    return html`
      <div
        style="display: flex; flex-direction: column; gap: 0.25rem; padding: 4%;"
        role="list"
        id="testme">
        ${widget.options.map(
          option => html`
            <button
              class="${option.id === widget.selected ? "selected" : ""}"
              @click="${() => {
                this.removeWidget()
                widget.onSelected(option.id)
              }}"
              role="listitem">
              ${option.display}
            </button>
          `
        )}
      </div>
      <style>
        button {
          background-color: transparent;
          font-family: monospace;
          line-height: 1.5;
          border: none;
          text-align: start;
          padding: 0.5rem;
          border-radius: 0.3rem;
        }
        button.selected {
          background-color: #be93fe;
        }
        button:hover {
          background-color: lightblue;
        }
      </style>
    `
  }

  protected renderEditListWidget<T>({
    values,
    onEdited,
    renderItem,
  }: EditListWidget<T>): TemplateResult<1>[] {
    const onItemChange = (index: number, value: T) => {
      const newValues = [...values]
      newValues[index] = value
      onEdited(newValues)
    }

    return values.map((value, index) =>
      renderItem(value, index, newValue => {
        onItemChange(index, newValue)
      })
    )
  }

  protected renderOverlayWidegt(widget: OverlayWidget): TemplateResult<1> {
    return widget.content
  }

  protected renderWidgetBackground(width: number, height: number): TemplateResult<2> {
    const rectangle = new RectBuilder({
      width: width - 1,
      height: height - 5.5,
      radius: 5,
      offset: { x: 0.5, y: 5 },
    }).addToTop(
      {
        width: 10,
        length: 5,
        mode: "outward",
        pointing: "vertical",
        pointRadius: 3,
        baseRadius: 2,
      },
      14
    )

    return svg`
      <path d="${rectangle.generatePath()}" fill="#fff" stroke="black" stroke-width="1" />
    `
  }
}
