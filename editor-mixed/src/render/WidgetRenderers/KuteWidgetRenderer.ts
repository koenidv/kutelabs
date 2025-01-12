import { html, svg, type TemplateResult } from "lit"
import { RectBuilder } from "../../svg/RectBuilder"
import {
  BaseWidgetRenderer,
  type EditListWidget,
  type OverlayWidget,
  type SelectorWidget,
} from "./BaseWidgetRenderer"

export class KuteWidgetRenderer extends BaseWidgetRenderer {
  containerPadding = { top: 2.75, right: 0, bottom: 0.5, left: 0 }

  renderSelectorWidget(widget: SelectorWidget): TemplateResult<1> {
    return html`
      <div style="display: flex; flex-direction: column; gap: 0.25rem; padding: 4%;" role="list">
        ${widget.options.map(
          option => html`
            <button
              class="${option.id === widget.selected ? "selected" : ""}"
              @pointerup=${() => {
                this.removeWidget()
                widget.onSelected(option.id)
              }}
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
  }: EditListWidget<T>): TemplateResult<1> {
    const setValues = (newValues: T[]) => {
      onEdited(newValues)
      // override current widget values as they are only set on show widget
      ;(this.displayedWidget as EditListWidget<T>).values = newValues
      this.dirty = true
      this.requestUpdate()
    }

    const onItemChange = (index: number, value: T) => {
      values[index] = value // update the reference directly, will be used in next render
      setValues(values)
      this.dirty = true
      this.requestUpdate()
    }

    return html`
      <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem;">
        ${values.map(
          (value, index) => html`
            <div style="display: flex; flex-direction: row; height: 2rem;">
              ${renderItem(value, index, newValue => {
                onItemChange(index, newValue)
              })}
              <button
                class="edit-list-remove"
                @pointerup=${() => setValues(values.filter((_, i) => i !== index))}
                aria-label="Remove element">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" d="M16 12H8" />
                    <path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" />
                  </g>
                </svg>
              </button>
            </div>
          `
        )}
        <button
          class="edit-list-add"
          @pointerup=${() => setValues([...values, undefined as any])}
          aria-label="Add element">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" d="M12 16V8m4 4H8" />
              <path d="M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0Z" />
            </g>
          </svg>
          Add
        </button>
        <style>
          .edit-list-add,
          .edit-list-remove {
            border: none;
            background-color: transparent;
            padding: 0.25rem;
            border-radius: 0.25rem;
            transition: background-color 100ms;
          }
          .edit-list-add {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
          }
          .edit-list-add:hover {
            background-color: #e7dbc0;
          }
          .edit-list-remove:hover {
            background-color: #fda4af;
          }
        </style>
      </div>
    `
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
      <path d="${rectangle.generatePath()}" fill="currentColor" stroke="black" stroke-width="1" />
    `
  }
}
