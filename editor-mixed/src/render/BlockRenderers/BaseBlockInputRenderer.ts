import { type TemplateResult, html, svg } from "lit"
import { type Ref, createRef, ref } from "lit/directives/ref.js"
import { approximateCaretPosition } from "../../inputs/InputUtils"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import { normalizePrimaryPointerPosition } from "../../util/InputUtils"

/* import custom elements - this is required but will not throw if it's removed */
import {
  DataType,
  type SimpleDataType,
  type TsTypeByDataType,
} from "../../blocks/configuration/DataType"
import "../../drag/TapOrDragLayer"
import "../../inputs/PrismKotlinEditor"
import type { Widget } from "../WidgetRenderers/BaseWidgetRenderer"
import type { InternalBlockRenderProps } from "./BlockRendererTypes"
import { PropertiesBlockRenderer } from "./PropertiesBlockRenderer"

export abstract class BaseBlockInputRenderer extends PropertiesBlockRenderer {
  //#region Input Wrappers

  /**
   * Wraps a block in a tap-or-drag-layer element to enable dragging the block on this element
   * @param content Function to render the content of the layer
   * @returns HTML template result
   */
  protected tapOrDragLayer<RefType extends HTMLElement>(
    content: (ref: Ref<RefType>) => TemplateResult<1>
  ) {
    const ref = createRef<RefType>()
    return html`
      <tap-or-drag-layer .tappableComponent=${ref}> ${content(ref)} </tap-or-drag-layer>
    `
  }

  /**
   * Input field wrapper that wraps the input in a TapDragLayer and opens it in an overlay widget on mousedown.
   * @param registered Block this input is rendered for
   * @param elementPosition Position of the input field, relative to the content group (in svg units)
   * @param elementSize Size of the input field (in svg units)
   * @param widgetSize Size of the widget that will be opened
   * @param inputElement Function to render the input element
   * @param onWidgetOpened Function to be called when the widget is opened
   * @param props context properties to be passed down the block tree
   * @returns SVG template result for the input field
   */
  protected inputInWidget<RefType extends HTMLElement>(
    registered: AnyRegisteredBlock,
    elementPosition: Coordinates,
    widgetPosition: Coordinates | undefined,
    elementSize: Coordinates,
    widgetSize: Coordinates = elementSize,
    inputElement: (ref: Ref<RefType>, isInWidget: boolean) => TemplateResult<1>,
    widget: Widget | undefined,
    onWidgetOpened: (
      originRef: RefType,
      targetRef: RefType,
      evt: MouseEvent | TouchEvent | KeyboardEvent
    ) => void = () => {},
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const openInWidget = (evt: MouseEvent | TouchEvent | KeyboardEvent) => {
      const widgetInputRef = createRef<RefType>()
      this.setWidget(
        widget ?? {
          type: "overlay",
          content: html`
            <div
              style="border-radius: ${6 /
              this._workspaceScaleFactor}px; width: 100%; height: 100%; overflow: auto;">
              ${inputElement(widgetInputRef, true)}
            </div>
          `,
        },
        widgetPosition ?? registered.globalPosition.add(elementPosition),
        widgetSize
      )
      const originInput = inputRef.value
      setTimeout(
        () =>
          originInput &&
          widgetInputRef.value &&
          onWidgetOpened(originInput, widgetInputRef.value, evt),
        0
      )
    }

    const onOpenEvent = (evt: MouseEvent | TouchEvent | KeyboardEvent) => {
      if (registered.block.isInDrawer) return
      if (evt instanceof KeyboardEvent && evt.key != "Enter") return
      if (!(evt instanceof KeyboardEvent) && evt.isTrusted) return // only events from tapdraglayer should be handled; these will not be trusted
      evt.preventDefault()
      openInWidget(evt)
    }

    const inputRef = createRef<RefType>()

    return svg`
        <foreignObject x=${elementPosition.x} y=${elementPosition.y} width=${elementSize.x} height=${elementSize.y} style="border-radius: 6px;">
        ${this.tapOrDragLayer(
          reference => html`
            <div
              ${ref(reference)}
              class="donotdrag"
              style="width: 100%; height: 100%; cursor: text; overflow: auto; ${registered.block
                .isInDrawer
                ? this._safariFixOnly
                : this._safariTransform}"
              tabindex=${registered.block.isInDrawer ? -1 : ++props.tabindex}
              @mousedown=${onOpenEvent}
              @touchstart=${onOpenEvent}
              @keydown=${onOpenEvent}>
              <div style="pointer-events: none; width: 100%; height: 100%;">
                ${inputElement(inputRef, false)}
              </div>
            </div>
          `
        )}
        </foreignObject>
        `
  }

  /**
   * Estimates the selected cursor position and sets it to the newly created input field on widget open.
   * @param origin Reference to the original input field
   * @param target Reference to the new input field
   * @param evt Event that triggered the opening of the widget
   */
  protected setSelectionOnWidgetOpened(
    _origin: HTMLTextAreaElement | HTMLInputElement,
    target: HTMLTextAreaElement | HTMLInputElement,
    evt: MouseEvent | TouchEvent | KeyboardEvent
  ) {
    target.focus()
    if (evt instanceof KeyboardEvent) {
      target.setSelectionRange(0, target.value.length)
      return
    }
    const position = normalizePrimaryPointerPosition(evt)
    const focusPosition = approximateCaretPosition(target, position!.x, position!.y)
    target.setSelectionRange(focusPosition ?? 0, focusPosition ?? target.value.length)
  }

  /**
   * Renders a code input area that will open in a widget.
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   * @returns SVG template result for the editable code input
   */
  public editableCode(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void,
    singleLine: boolean,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    return this.inputInWidget<HTMLTextAreaElement>(
      registered,
      position,
      undefined,
      size,
      undefined,
      ref => this.renderInputCode(registered, value, onChange, singleLine, ref),
      undefined,
      this.setSelectionOnWidgetOpened.bind(this),
      props
    )
  }

  /**
   * Renders an editable string input that will open in a widget.
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   * @returns SVG template result for the editable string input
   */
  public inputString(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    return this.inputInWidget<HTMLInputElement>(
      registered,
      position,
      undefined,
      size,
      undefined,
      (ref, inWidget) =>
        this.renderInputString(
          value,
          onChange,
          () => {},
          placeholder,
          ref,
          inWidget ? (1 / this._workspaceScaleFactor) * 0.82 : 1
        ),
      undefined,
      this.setSelectionOnWidgetOpened.bind(this),
      props
    )
  }

  /**
   * Renders an editable string input, will be wrapped in a TapDragLayer.
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   * @returns SVG template result for the editable string input
   */
  public inputBoolean(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: boolean,
    onChange: (value: boolean) => void,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const onClick = (e: MouseEvent | TouchEvent | KeyboardEvent) => {
      if (
        typeof KeyboardEvent !== "undefined" &&
        ((!(e instanceof KeyboardEvent) && e.isTrusted) ||
          (e instanceof KeyboardEvent && e.key != "Enter" && e.key != " "))
      ) {
        return
      }
      onChange(!value)
      this.requestUpdate()
    }

    return svg`
        <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} style="">
        ${this.tapOrDragLayer(
          reference => html`
            <div
              ${ref(reference)}
              class="donotdrag"
              style="width: 100%; height: 100%; cursor: pointer; overflow: auto; ${registered.block
                .isInDrawer
                ? this._safariFixOnly
                : this._safariTransform}"
              tabindex=${registered.block.isInDrawer ? -1 : ++props.tabindex}
              @mousedown="${onClick}"
              @touchstart="${onClick}"
              @keydown="${onClick}">
              <div style="pointer-events: none; width: 100%; height: 100%;">
                ${this.renderInputBoolean(value)}
              </div>
            </div>
          `
        )}
        </foreignObject>
        `
  }

  public inputArray<T extends SimpleDataType>(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    type: T,
    values: TsTypeByDataType<T>[],
    onChange: (value: TsTypeByDataType<T>[]) => void,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const inputElement = this.inputElementByDataType(type)

    return this.inputInWidget<HTMLInputElement>(
      registered,
      position,
      registered.globalPosition.add(position).plus(0, size.y),
      size,
      new Coordinates(200, 200),
      (ref, inWidget) =>
        this.renderInputString(
          values.join(", "),
          () => {},
          () => {},
          undefined,
          ref,
          inWidget ? (1 / this._workspaceScaleFactor) * 0.82 : 1
        ),
      {
        type: "edit-list",
        values: values,
        onEdited: onChange,
        renderItem: (value, _index, onItemChange) => {
          return inputElement(value, onItemChange)
        },
      },
      undefined,
      props
    )
  }

  protected inputElementByDataType<T extends SimpleDataType>(
    type: SimpleDataType
  ): (
    value: TsTypeByDataType<T>,
    onChange: (value: TsTypeByDataType<T>) => void
  ) => TemplateResult<1> {
    switch (type) {
      case DataType.Boolean:
        return this.renderInputBoolean as any
      case DataType.String:
        return this.renderInputString as any
      case DataType.Int:
        return this.renderInputString as any
      case DataType.Float:
        return this.renderInputString as any
    }
  }

  /**
   * Renders a selector input, options will be displayed in a widget.
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param widgetSize size of the widget that will be opened
   * @param values list of ids and values to select from
   * @param selected id of the currently selected value
   * @param onSelected function to call when a value is selected
   * @param props context properties to be passed down the block tree
   * @returns
   */
  public inputSelector(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    widgetSize: Coordinates,
    values: { id: string; display: string }[],
    selected: string,
    onSelected: (id: string) => void,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    return this.inputInWidget(
      registered,
      position,
      registered.globalPosition.add(position).plus(0, size.y),
      size,
      widgetSize,
      () => this.renderInputSelector(values, selected),
      {
        type: "selector",
        options: values,
        selected,
        onSelected: (it: string) => {
          onSelected(it)
          return true
        },
      },
      undefined,
      props
    )
  }

  //#region Abstract Render Methods

  /**
   * Renders an editable code input field
   * @param registered registered block this input is for
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputCode(
    registered: AnyRegisteredBlock,
    value: string,
    onChange: (value: string) => void,
    singleLine: boolean,
    reference: Ref<HTMLTextAreaElement> | undefined
  ): TemplateResult<1>

  /**
   * Renders an input field for a block
   * @param registered registered block this input is for
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param onKeydown function to call when a key is pressed
   * @param reference reference to set on to the input field element
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputString(
    value: string,
    onChange: (value: string) => void,
    onKeydown?: (e: KeyboardEvent) => void,
    placeholder?: string,
    reference?: Ref<HTMLInputElement> | undefined,
    textScaling?: number
  ): TemplateResult<1>

  /**
   * Renders a boolean input for a block
   * Defaults to a string input with true/false values
   * @param registered registered block this input is for
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputBoolean(
    value: boolean,
    onChange?: (value: boolean) => void
  ): TemplateResult<1>

  /**
   * Renders a selector input // todo make protected and expose inputSelector Wrapper
   * The input may display a widget to facilitate selecting from a list of values
   * @param registered registered block this input is for
   * @param size size of the input field (in svg units)
   * @param values list of ids and values to select from
   * @param selected id of the currently selected value
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputSelector(
    values: { id: string; display: string }[],
    selected: string
  ): TemplateResult<1>
}
