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
import type { EditListWidget, OverlayWidget, Widget } from "../WidgetRenderers/BaseWidgetRenderer"
import type { InternalBlockRenderProps } from "./BlockRendererTypes"
import { PropertiesBlockRenderer } from "./PropertiesBlockRenderer"
import type { BlockInputIcon } from "./InputIcon"

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
  protected inputInWidget<RefType extends HTMLElement, W extends Widget = OverlayWidget>(
    registered: AnyRegisteredBlock,
    elementPosition: Coordinates,
    widgetPosition: Coordinates | undefined,
    elementSize: Coordinates,
    widgetSize: Coordinates = elementSize,
    inputElement: (
      ref: Ref<RefType>,
      updateWidget?: (updated: OverlayWidget["content"]) => void
    ) => TemplateResult<1>,
    widget: W | undefined,
    onWidgetOpened: (
      originRef: RefType,
      targetRef: RefType,
      evt: MouseEvent | TouchEvent | KeyboardEvent
    ) => void = () => {},
    enabled: boolean,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const openInWidget = (evt: MouseEvent | TouchEvent | KeyboardEvent) => {
      if (!enabled) return
      const widgetInputRef = createRef<RefType>()
      this.setWidget(
        widget ?? {
          type: "overlay",
          content: update => html`
            <div
              style="border-radius: ${6 /
              this._workspaceScaleFactor}px; width: 100%; height: 100%; overflow: auto;">
              ${inputElement(widgetInputRef, update)}
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
                ${inputElement(inputRef)}
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

  public inputButton(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    enabled: boolean,
    value: string | { label: string },
    onClick: (e: Event) => void,
    iconStart: BlockInputIcon | undefined,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    return svg`
    <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} style="border-radius: 6px;">
    ${this.tapOrDragLayer(
      reference => html`
        <div
          class="donotdrag"
          style="width: 100%; height: 100%; cursor: text; overflow: auto; ${registered.block
            .isInDrawer
            ? this._safariFixOnly
            : this._safariTransform}"
          tabindex=${registered.block.isInDrawer ? -1 : ++props.tabindex}>
          <div style="pointer-events: none; width: 100%; height: 100%;">
            ${this.renderInputButton(value, enabled, onClick, reference, iconStart)}
          </div>
        </div>
      `
    )}
    </foreignObject>
    `
  }

  /**
   * Renders a code input area that will open in a widget.
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param editable whether the input field is editable
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param singleLine whether the input enforces a single line input
   * @param props context properties to be passed down the block tree
   * @returns SVG template result for the editable code input
   */
  public editableCode(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    editable: boolean,
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
      editable,
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
    editable: boolean,
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
      (ref, widget) =>
        this.renderInputString(
          value,
          onChange,
          widget != undefined,
          () => {},
          placeholder,
          ref,
          widget != undefined ? (1 / this._workspaceScaleFactor) * 0.82 : 1
        ),
      undefined,
      this.setSelectionOnWidgetOpened.bind(this),
      editable,
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
    editable: boolean,
    value: boolean,
    onChange: (value: boolean) => void,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const onClick = (e: MouseEvent | TouchEvent | KeyboardEvent) => {
      if (!editable) return
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

  /** don't look at this code, it's pretty bad, very sorry (widget/input interaction needs a refactor)*/
  public inputNumber(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    editable: boolean,
    value: number,
    onChange: (value: number) => void,
    isFloat: boolean,
    placeholder: string,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const element = (
      ref: Ref<HTMLInputElement>,
      update: ((updated: OverlayWidget["content"]) => void) | undefined,
      currentValue: number
    ) =>
      this.renderInputNumber(
        currentValue,
        (newValue, skipUpdate) => {
          newValue = isFloat ? parseFloat(newValue.toFixed(8)) : Math.round(newValue)
          onChange(newValue)
          if (update && !skipUpdate) {
            update(newUpdate => element(ref, newUpdate, newValue))
            this.requestUpdate()
          }
        },
        editable && update != undefined,
        isFloat,
        placeholder,
        ref,
        update != undefined ? (1 / this._workspaceScaleFactor) * 0.82 : 1
      )

    return this.inputInWidget<HTMLInputElement>(
      registered,
      position,
      undefined,
      size,
      undefined,
      (ref, update) => element(ref, update, value),
      undefined,
      this.setSelectionOnWidgetOpened.bind(this),
      editable,
      props
    )
  }

  public inputArray<T extends SimpleDataType>(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    type: T,
    editable: boolean,
    values: TsTypeByDataType<T>[],
    onChange: (value: TsTypeByDataType<T>[]) => void,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const inputElement = this.inputElementByDataType(type)

    return this.inputInWidget<HTMLInputElement, EditListWidget<TsTypeByDataType<T>>>(
      registered,
      position,
      registered.globalPosition.add(position).plus(0, size.y),
      size,
      new Coordinates(200, 200),
      () => this.renderArrayTarget(type, registered.block.isInDrawer ? undefined : values),
      {
        type: "edit-list",
        values: values,
        onEdited: onChange,
        renderItem: (value, _index, onItemChange) => {
          return inputElement(
            value,
            onItemChange as (value: string | number | boolean) => void,
            true
          )
        },
      },
      undefined,
      editable,
      props
    )
  }

  protected inputElementByDataType<T extends SimpleDataType>(
    type: SimpleDataType
  ): (
    value: TsTypeByDataType<T>,
    onChange: (value: TsTypeByDataType<T>) => void,
    editable: boolean
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
    editable: boolean,
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
      editable,
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
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param onKeydown function to call when a key is pressed
   * @param reference reference to set on to the input field element
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputString(
    value: string,
    onChange: (value: string) => void,
    editable?: boolean,
    onKeydown?: (e: KeyboardEvent) => void,
    placeholder?: string,
    reference?: Ref<HTMLInputElement> | undefined,
    textScaling?: number
  ): TemplateResult<1>

  /**
   * Renders a button input for a block
   * @param value text to display
   * @param onClick function to call when the button is clicked
   */
  protected abstract renderInputButton(
    value: string | { label: string },
    enabled?: boolean,
    onClick?: (e: Event) => void,
    reference?: Ref<HTMLElement> | undefined,
    iconStart?: BlockInputIcon
  ): TemplateResult<1>

  /**
   * Renders a boolean input for a block
   * Defaults to a string input with true/false values
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputBoolean(
    value: boolean,
    onChange?: (value: boolean) => void,
    editable?: boolean
  ): TemplateResult<1>

  /**
   * Renders an integer or float input for a block
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param editable whether the input field is editable
   * @param isFloat whether the input field is a float
   * @param placeholder placeholder text for the input field
   * @param reference reference to set on to the input field element
   * @param textScaling scaling factor for the text size
   */
  protected abstract renderInputNumber(
    value: number,
    onChange?: (value: number, skipUpdate?: boolean) => void,
    editable?: boolean,
    isFloat?: boolean,
    placeholder?: string,
    reference?: Ref<HTMLInputElement> | undefined,
    textScaling?: number
  ): TemplateResult<1>

  /**
   * Renders a selector input // todo make protected and expose inputSelector Wrapper
   * The input may display a widget to facilitate selecting from a list of values
   * @param values list of ids and values to select from
   * @param selected id of the currently selected value
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputSelector(
    values: { id: string; display: string }[],
    selected: string
  ): TemplateResult<1>

  /**
   * Renders the element on a block that leads to the array edit widget
   * @param type type of the array
   * @param value current value of the array
   */
  protected abstract renderArrayTarget<T extends SimpleDataType>(
    type: T,
    value?: TsTypeByDataType<T>[]
  ): TemplateResult<1>

  protected abstract renderIcon(icon: BlockInputIcon, size: Coordinates): TemplateResult<1>
}
