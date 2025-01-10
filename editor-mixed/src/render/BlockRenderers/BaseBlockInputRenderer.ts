import { type TemplateResult, html, svg } from "lit"
import { type Ref, createRef, ref } from "lit/directives/ref.js"
import type { BlockType } from "../../blocks/configuration/BlockType"
import type { DataType } from "../../blocks/configuration/DataType"
import { approximateCaretPosition } from "../../inputs/InputUtils"
import type { AnyRegisteredBlock } from "../../registries/RegisteredBlock"
import type { Coordinates } from "../../util/Coordinates"
import { normalizePrimaryPointerPosition } from "../../util/InputUtils"
import type { Block } from "../../blocks/Block"

/* import custom elements - this is required but will not throw if it's removed */
import "../../drag/TapOrDragLayer"
import "../../inputs/PrismKotlinEditor"
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
    elementSize: Coordinates,
    widgetSize: Coordinates = elementSize,
    inputElement: (ref: Ref<RefType>) => TemplateResult<1>,
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
        {
          type: "overlay",
          content: html`
            <div
              style="border-radius: ${6 /
              this._workspaceScaleFactor}px; width: 100%; height: 100%; overflow: auto;">
              ${inputElement(widgetInputRef)}
            </div>
          `,
          size: widgetSize,
        },
        registered.globalPosition.add(elementPosition)
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
        <foreignObject x=${elementPosition.x} y=${elementPosition.y} width=${elementSize.x} height=${elementSize.y} style="">
        ${this.tapOrDragLayer(
          reference => html`
            <div
              ${ref(reference)}
              class="donotdrag"
              style="width: 100%; height: 100%; cursor: text; overflow: auto;"
              tabindex=${++props.tabindex}
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
   * @param originRef Reference to the original input field
   * @param targetRef Reference to the new input field
   * @param evt Event that triggered the opening of the widget
   */
  protected setSelectionOnWidgetOpened(
    originRef: HTMLTextAreaElement | HTMLInputElement,
    targetRef: HTMLTextAreaElement | HTMLInputElement,
    evt: MouseEvent | TouchEvent | KeyboardEvent
  ) {
    console.log(originRef.value, targetRef.value)
    targetRef.focus()
    if (evt instanceof KeyboardEvent) {
      targetRef.setSelectionRange(0, targetRef.value.length)
      return
    }
    const position = normalizePrimaryPointerPosition(evt)
    const focusPosition = approximateCaretPosition(originRef, position!.x, position!.y)
    targetRef.setSelectionRange(focusPosition ?? 0, focusPosition ?? targetRef.value.length)
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
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    return this.inputInWidget<HTMLTextAreaElement>(
      registered,
      position,
      size,
      undefined,
      ref => this.renderInputCode(registered, size, value, onChange, ref, props),
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
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    return this.inputInWidget<HTMLInputElement>(
      registered,
      position,
      size,
      undefined,
      ref => this.renderInputString(registered, size, value, onChange, () => {}, ref, props),
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
              style="width: 100%; height: 100%; cursor: pointer; overflow: auto;"
              tabindex=${++props.tabindex}
              @mousedown="${onClick}"
              @touchstart="${onClick}"
              @keydown="${onClick}">
              <div style="pointer-events: none; width: 100%; height: 100%;">
                ${this.renderInputBoolean(registered, size, value, props)}
              </div>
            </div>
          `
        )}
        </foreignObject>
        `
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
    size: Coordinates,
    value: string,
    onChange: (value: string) => void,
    reference: Ref<HTMLTextAreaElement> | undefined,
    props: InternalBlockRenderProps
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
    registered: AnyRegisteredBlock,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void,
    onKeydown: (e: KeyboardEvent) => void,
    reference: Ref<HTMLInputElement> | undefined,
    props: InternalBlockRenderProps
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
    registered: AnyRegisteredBlock,
    size: Coordinates,
    value: boolean,
    props: InternalBlockRenderProps
  ): TemplateResult<1>

  /**
   * Renders a selector input // todo make protected and expose inputSelector Wrapper
   * The input may display a widget to facilitate selecting from a list of values
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param widgetPosition position of the widget, relative to the root (global svg position)
   * @param values list of ids and values to select from
   * @param selected id of the currently selected value
   * @param onSelect function to call with the selected id when a value is selected
   */
  public abstract renderInputSelector(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    widgetPosition: Coordinates,
    values: { id: string; display: string }[],
    selected: string,
    onSelect: (id: string) => void,
    props: InternalBlockRenderProps
  ): TemplateResult<2>
}
