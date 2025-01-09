import { html, svg, type TemplateResult } from "lit"
import { createRef, ref, type Ref } from "lit/directives/ref.js"
import type { AnyBlock, Block } from "../../blocks/Block"
import { BlockType } from "../../blocks/configuration/BlockType"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"
import { isSafari } from "../../util/browserCheck"
import { Coordinates } from "../../util/Coordinates"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import type { BaseWidgetRenderer } from "../WidgetRenderers/BaseWidgetRenderer"

/* import custom elements - this is required but will not throw if it's removed */
import type { DataType } from "../../blocks/configuration/DataType"
import { ConnectorType } from "../../connections/ConnectorType"
import "../../drag/TapOrDragLayer"
import { approximateCaretPosition } from "../../inputs/InputUtils"
import "../../inputs/PrismKotlinEditor"
import { normalizePrimaryPointerPosition } from "../../util/InputUtils"

export enum BlockMarking {
  Executing = "executing",
  Error = "error",
}

export type SvgResult = TemplateResult<2> | TemplateResult<2>[]

/** A set of options to be passed down the block tree to pass context to downstream blocks */
export type InternalBlockRenderProps = {
  tabindex: number
  level: number
  indexInLevel?: number
}

/**
 * The BlockRenderer is responsible for rendering blocks in the workspace.
 * It will also be called from other renderers to render blocks in different contexts.
 */
export abstract class BaseBlockRenderer {
  private readonly blockRegistry: BlockRegistry
  private readonly layouter: BaseLayouter

  protected readonly setWidget: typeof BaseWidgetRenderer.prototype.setWidget

  /* Because Safari doesn't apply viewBox scaling to foreignObject elements, we need to apply a workaround*/
  protected _workspaceScaleFactor = 1
  /** additional classes to apply, will hold scale information for safari */
  protected _safariTransform = ""
  public setWorkspaceScaleFactor(value: number) {
    this._workspaceScaleFactor = value
    this._safariTransform = isSafari
      ? `position: fixed; transform: scale(${1 / this._workspaceScaleFactor}); transform-origin: 0 0;`
      : ""
  }

  constructor(
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget
  ) {
    this.blockRegistry = blockRegistry
    this.layouter = layouter
    this.setWidget = setWidget
  }

  /**
   * Renders all blocks in the workspace
   * @returns List of an SVG template for each block
   */
  render(): TemplateResult<2>[] {
    this.init()
    return this.renderFromRoot()
  }

  /**
   * Measures and positions all blocks in the workspace for a complete rerender
   */
  protected init() {
    this.layouter.measureSetAll()
    this.layouter.calculatePositionsFromRoot()
  }

  //#region Render blocks

  /**
   * Renders all blocks, beginning from the root
   * @returns List of SVG templates for all blocks
   */
  protected renderFromRoot(): TemplateResult<2>[] {
    if (this.blockRegistry.root == null) throw new Error("Cannot render; root is not set")
    const props: InternalBlockRenderProps = { tabindex: 1000, level: 1 }
    return this.blockRegistry.root.blocks.map(({ block, position }) =>
      this.renderBlock(block, position, props)
    )
  }

  /**
   * Render a block at a position relative to an upstream connected block
   * @param block Block to render
   * @param previousBlock Upstream connected block
   * @param props context properties to be passed down the block tree
   * @returns SVG template for block group
   */
  public renderBlock(
    block: AnyBlock,
    previousBlock: AnyBlock,
    props: InternalBlockRenderProps
  ): TemplateResult<2>
  /**
   * Render a block with an offset to its upstream block.
   * Use this to render Blocks from the root
   * @param block Block to render
   * @param translatePosition Offset to upstream block, i.e. will render at this position for root upstream
   * @param props context properties to be passed down the block tree
   * @returns SVG template for block group
   */
  public renderBlock(
    block: AnyBlock,
    translatePosition: Coordinates,
    props: InternalBlockRenderProps
  ): TemplateResult<2>
  /**
   * Renders a block with an offset to a reference block
   * @param block Block to render
   * @param ref Block or Coordinate Object to render the block relative to
   * @param props context properties to be passed down the block tree
   * @returns SVG template for block group
   */
  public renderBlock(
    block: AnyBlock,
    ref: AnyBlock | Coordinates,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    return this.draggableContainer(
      block.id,
      this.determineRenderOffset(block, ref),
      block.draggable,
      props,
      () =>
        this.renderBlockElement(this.blockRegistry.getRegistered(block), props, (next: AnyBlock) =>
          this.renderBlock(next, block, props)
        )
    )
  }

  /**
   * Renders a block element and its connected blocks
   * @param registered registered block to render
   * @param renderConnected Function to render a connected block
   * @returns SVG template for block group
   *
   * **aria attributes:**
   * - role: treeitem as element within the workspace block tree, or listitem for the drawer list
   * - aria-label: type of block
   * - aria-describedby: description element with info about the connector
   * - aria-level: level in the block tree (+1 for each inner/extension etc)
   * - aria-posinset: index within the current level
   * - aria-setsize: total number of blocks in the current level
   * - tabindex: sequential tab index across all blocks for keyboard navigation
   */
  protected renderBlockElement(
    registered: AnyRegisteredBlock,
    props: InternalBlockRenderProps,
    renderConnected: (block: AnyBlock) => TemplateResult<2>
  ): TemplateResult<2> {
    const upstreamConnector = registered.block.upstreamConnectorInUse
    const upstreamBlock = registered.block.upstream
    props.indexInLevel = (props.indexInLevel ?? -1) + 1

    return svg`
    <g class="block-container block-${registered.block.type}"
      tabindex=${++props.tabindex} 
      role=${upstreamBlock && "drawerConnector" in upstreamBlock ? "listitem" : "treeitem"}
      aria-label="${registered.block.type} block"
      aria-level=${props.level}
      aria-describedby="block-${registered.block.id}-desc"
      aria-posinset=${(props.indexInLevel ?? 0) + 1}
      aria-setsize=${(props.indexInLevel ?? 0) + registered.block.countAfterRecursive}
      >
      ${this.renderContainer(registered, props)}
      ${this.renderContent(registered, props)}
      ${registered.block.downstreamWithConnectors.reverse().map(({ block, connector }) => {
        // Only increase level for blocks that are not connected after, and do not propagate to after-connected blocks
        let indexInLevel = props.indexInLevel ?? 0
        if (connector.type != ConnectorType.After) {
          ++props.level
          props.indexInLevel = undefined
        }
        const rendered = renderConnected(block)
        if (connector.type != ConnectorType.After) {
          --props.level
          props.indexInLevel = indexInLevel
        }
        return rendered
      })}
    
	  </g>
    <desc id="block-${registered.block.id}-desc">
      ${
        upstreamBlock && "drawerConnector" in upstreamBlock
          ? `${registered.block.type} block in drawer`
          : upstreamBlock && "rootConnector" in upstreamBlock
            ? "First block in stack"
            : `Connected to ${upstreamBlock?.type} block on ${upstreamConnector?.role} ${upstreamConnector?.type} connector`
      }
    </desc>
    `
  }

  /**
   * Renders the content of a block, depending on its type
   * @param registered registered block to render
   * @param props context properties to be passed down the block tree
   * @returns SVG template for block content
   */
  protected renderContent(
    registered: AnyRegisteredBlock,
    props: InternalBlockRenderProps
  ): SvgResult {
    switch (registered.block.type) {
      case BlockType.Function:
        return this.renderContentFunction(
          registered as RegisteredBlock<BlockType.Function, any>,
          props
        )
      case BlockType.Expression:
        return this.renderContentExpression(
          registered as RegisteredBlock<BlockType.Expression, any>,
          props
        )
      case BlockType.Value:
        return this.renderContentValue(registered as RegisteredBlock<BlockType.Value, any>, props)
      case BlockType.Variable:
        return this.renderContentVariable(
          registered as RegisteredBlock<BlockType.Variable, any>,
          props
        )
      case BlockType.VarInit:
        return this.renderContentVariableInit(
          registered as RegisteredBlock<BlockType.VarInit, any>,
          props
        )
      case BlockType.VarSet:
        return this.renderContentVariableSet(
          registered as RegisteredBlock<BlockType.VarSet, any>,
          props
        )
      case BlockType.Loop:
        return this.renderContentLoop(registered as RegisteredBlock<BlockType.Loop, any>, props)
      case BlockType.Conditional:
        return this.renderContentConditional(
          registered as RegisteredBlock<BlockType.Conditional, any>,
          props
        )
      case BlockType.LogicNot:
        return this.renderContentLogicNot(
          registered as RegisteredBlock<BlockType.LogicNot, any>,
          props
        )
      case BlockType.LogicJunction:
        return this.renderContentLogicJunction(
          registered as RegisteredBlock<BlockType.LogicJunction, any>,
          props
        )
      case BlockType.LogicComparison:
        return this.renderContentLogicComparison(
          registered as RegisteredBlock<BlockType.LogicComparison, any>,
          props
        )
      default:
        console.error("No content renderer for block type", registered.block.type)
        return this.renderDefaultContent(registered, props)
    }
  }

  //#region Utilities

  /**
   * Wraps a block in a tap-or-drag-layer element to enable dragging the block on this element
   * @param content Function to render the content of the layer
   * @returns HTML template result
   */
  protected tapOrDragLayer(content: (ref: Ref<HTMLElement>) => TemplateResult<1>) {
    const ref = createRef<HTMLElement>()
    return html`
      <tap-or-drag-layer .tappableComponent=${ref}> ${content(ref)} </tap-or-drag-layer>
    `
  }

  /**
   * Wraps a block in a container that will be recognized as draggable by the DragHelper.
   * The container should also handle displaying block markings.
   * This element is not tab-able; tab focus should be handled by the block container for better focus highlighting.
   * @param blockId id of the block
   * @param translate offset to the previous group
   * @param draggable whether the block should be draggable
   * @param child Function to render the content of the group
   * @returns SVG template for block group
   */
  protected draggableContainer(
    blockId: string,
    translate: Coordinates,
    draggable: boolean = true,
    _props: InternalBlockRenderProps,
    child: () => TemplateResult<2>
  ): TemplateResult<2> {
    return svg`
    <g class="${draggable ? "dragable" : "nodrag"} block" tabindex="-1" transform="translate(${translate.x}, ${translate.y})" id="block-${blockId}">
      ${child()}
    </g>`
  }

  /**
   * Determines the offset to render a block relative to a reference block or coordinates.
   * - If the reference is a block, the offset is calculated from the block's position.
   * - If the reference is coordinates, the offset is the coordinates.
   * @param block block that is going to be rendered
   * @param ref reference block or coordinates to calulcate the offset from
   * @returns offset coordinates from the previous group
   */
  private determineRenderOffset(block: AnyBlock, ref: AnyBlock | Coordinates): Coordinates {
    if (ref instanceof Coordinates) return ref
    else
      return Coordinates.subtract(
        this.blockRegistry.getPosition(block),
        this.blockRegistry.getPosition(ref)
      )
  }

  //#region Input Wrappers

  /**
   * Renders an input field for a block.
   * This wrapper handles retrieving the language-specific value and changes to it.
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param props context properties to be passed down the block tree
   * @returns SVG template result for the editable code input
   */
  protected editableCode(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {

    // TODO CLEANUP
    // TODO value and set value should be defined in renderer

    const block = registered.block as Block<BlockType.Expression>
    const language = block.data.editable ? block.data.editable.lang : "kotlin"

    const value = block.data.customExpression?.get(language) ?? ""
    const onChange = (value: string) => {
      block.updateData(cur => {
        const expr = cur.customExpression?.set(language, value)
        return { ...cur, customExpression: expr }
      })
    }

    const openInWidget = (focusPosition?: number) => {
      const widgetInputRef = createRef<HTMLTextAreaElement>()
      this.setWidget(
        {
          type: "overlay",
          content: html`
          <div style="border-radius: ${6 / this._workspaceScaleFactor}px; width: 100%; height: 100%; overflow: auto;">
            ${this.renderInputCode(
              registered,
              position,
              size,
              value,
              onChange,
              widgetInputRef,
              props
            )}
            </div>
          `,
          size: size,
        },
        registered.globalPosition.add(position)
      )
      setTimeout(() => {
        widgetInputRef.value?.focus()
        widgetInputRef.value?.setSelectionRange(focusPosition ?? 0, focusPosition ?? value.length)
      }, 0)
    }


    const onMouseOrTouch = (e: MouseEvent | TouchEvent) => {
      // only accept inputs from TapOrDragLayer, which will be untrusted
      if (e.isTrusted || registered.block.isInDrawer) return
      const position = normalizePrimaryPointerPosition(e)
      const focusPosition = approximateCaretPosition(inputRef.value!, position!.x, position!.y)

      openInWidget(focusPosition)
      e.preventDefault()
    }

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key == "Enter" && !registered.block.isInDrawer) {
        e.preventDefault()
        e.stopPropagation()
        openInWidget()
      }
    }

    const inputRef = createRef<HTMLTextAreaElement>()

    return svg`
        <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} style="border-radius: 6px;">
        ${this.tapOrDragLayer(
          reference => html`
            <div
              ${ref(reference)}
              class="donotdrag"
              style="width: 100%; height: 100%; ${this._safariTransform}"
              tabindex=${++props.tabindex}
              @mousedown=${onMouseOrTouch}
              @touchstart=${onMouseOrTouch}
              @keydown=${onKeydown}>
              <!-- keydown not yet working -->
              ${this.renderInputCode(registered, position, size, value, onChange, inputRef, props)}
            </div>
          `
        )}
        `
  }

  protected inputString(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const block = registered.block as Block<BlockType.Value, DataType.String>

    const value = block.data.value
    const onChange = (value: string) => {
      block.updateData(cur => ({ ...cur, value: value }))
    }

    const openInWidget = (focusPosition?: number) => {
      const widgetInputRef = createRef<HTMLInputElement>()
      this.setWidget(
        {
          type: "overlay",
          content: html`
          <div style="border-radius: ${6 / this._workspaceScaleFactor}px; width: 100%; height: 100%; overflow: auto;">
            ${this.renderInputString(
              registered,
              position,
              size,
              value,
              onChange,
              () => {},
              widgetInputRef,
              props
            )}
            </div>
          `,
          size: size,
        },
        registered.globalPosition.add(position)
      )
      setTimeout(() => {
        widgetInputRef.value?.focus()
        widgetInputRef.value?.setSelectionRange(focusPosition ?? 0, focusPosition ?? value.length)
      }, 0)
    }

    const onMouseOrTouch = (e: MouseEvent | TouchEvent) => {
      // only accept inputs from TapOrDragLayer, which will be untrusted
      if (e.isTrusted || registered.block.isInDrawer) return
      const position = normalizePrimaryPointerPosition(e)
      const focusPosition = approximateCaretPosition(inputRef.value!, position!.x, position!.y)

      openInWidget(focusPosition)
      e.preventDefault()
    }

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key == "Enter" && !registered.block.isInDrawer) {
        e.preventDefault()
        e.stopPropagation()
        openInWidget()
      }
    }

    const inputRef = createRef<HTMLInputElement>()

    return svg`
        <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} style="">
        ${this.tapOrDragLayer(
          reference => html`
            <div
              ${ref(reference)}
              class="donotdrag"
              style="width: 100%; height: 100%; cursor: text; overflow: auto;"
              tabindex=${++props.tabindex}
              @mousedown=${onMouseOrTouch}
              @touchstart=${onMouseOrTouch}
              @keydown=${onKeydown}>
              <div style="pointer-events: none; width: 100%; height: 100%;">
                ${this.renderInputString(
                  registered,
                  position,
                  size,
                  value,
                  () => {},
                  () => {},
                  inputRef,
                  props
                )}
              </div>
            </div>
          `
        )}
        </foreignObject>
        `
  }

  protected inputBoolean(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    props: InternalBlockRenderProps
  ): TemplateResult<2> {
    const block = registered.block as Block<BlockType.Value, DataType.Boolean>

    const value = block.data.value
    const onClick = () => {
      block.updateData(cur => ({ ...cur, value: !(cur.value ?? false) }))
    }

    // todo tapordraglayer for svg elements
    return this.renderInputBoolean(registered, position, size, value, onClick, props)

    return svg`
        <foreignObject x=${position.x} y=${position.y} width=${size.x} height=${size.y} style="">
        ${this.tapOrDragLayer(
          reference => html`
            <div
              ${ref(reference)}
              class="donotdrag"
              style="width: 100%; height: 100%; cursor: text; overflow: auto;"
              tabindex=${++props.tabindex}>
              <div style="pointer-events: none; width: 100%; height: 100%;">
                ${this.renderInputBoolean(registered, position, size, value, onClick, props)}
              </div>
            </div>
          `
        )}
        </foreignObject>
        `
  }

  //#region Block Contents

  /** Override this to customize how the content of **function** blocks is rendered */
  protected renderContentFunction(
    registered: RegisteredBlock<BlockType.Function, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **expression** blocks is rendered */
  protected renderContentExpression(
    registered: RegisteredBlock<BlockType.Expression, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **value** blocks is rendered */
  protected renderContentValue(
    registered: RegisteredBlock<BlockType.Value, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **variable** blocks is rendered */
  protected renderContentVariable(
    registered: RegisteredBlock<BlockType.Variable, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **variable init** blocks is rendered */
  protected renderContentVariableInit(
    registered: RegisteredBlock<BlockType.VarInit, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **variable set** blocks is rendered */
  protected renderContentVariableSet(
    registered: RegisteredBlock<BlockType.VarSet, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **loop** blocks is rendered */
  protected renderContentLoop(
    registered: RegisteredBlock<BlockType.Loop, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **conditional** blocks is rendered */
  protected renderContentConditional(
    registered: RegisteredBlock<BlockType.Conditional, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **logic not** blocks is rendered */
  protected renderContentLogicNot(
    registered: RegisteredBlock<BlockType.LogicNot, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **logic junction** blocks is rendered */
  protected renderContentLogicJunction(
    registered: RegisteredBlock<BlockType.LogicJunction, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  /** Override this to customize how the content of **logic comparison** blocks is renderer */
  protected renderContentLogicComparison(
    registered: RegisteredBlock<BlockType.LogicComparison, any>,
    props: InternalBlockRenderProps
  ): SvgResult {
    return this.renderDefaultContent(registered, props)
  }

  //#region Abstract methods

  /**
   * Renders the background container for a block.
   * The container is rendered behind the elements of the block and does not have children.
   * Container rendering is called before content rendering and changes to the context props will be applied there
   * @param registered registered block that is being rendered
   * @param props context properties to be passed down the block tree
   * @returns SVG template or array for the container
   */
  protected abstract renderContainer(
    registered: AnyRegisteredBlock,
    props: InternalBlockRenderProps
  ): SvgResult

  /**
   * Renders the contents of a block when no specific content renderer is defined.
   * @param registered registered block to render contents for
   * @param props context properties to be passed down the block tree
   * @returns SVG template or array
   */
  protected abstract renderDefaultContent(
    registered: AnyRegisteredBlock,
    props: InternalBlockRenderProps
  ): SvgResult

  /**
   * Renders an editable code input field
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputCode(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: string,
    onChange: (value: string) => void,
    reference: Ref<HTMLTextAreaElement> | undefined,
    props: InternalBlockRenderProps
  ): TemplateResult<1>

  /**
   * Renders an input field for a block
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param onKeydown function to call when a key is pressed
   * @param reference reference to set on to the input field element
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputString(
    registered: AnyRegisteredBlock,
    position: Coordinates,
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
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param value current value of the input field
   * @param onChange function to call when the value changes
   * @param props context properties to be passed down the block tree
   */
  protected abstract renderInputBoolean(
    registered: AnyRegisteredBlock,
    position: Coordinates,
    size: Coordinates,
    value: boolean,
    onClick: () => void,
    props: InternalBlockRenderProps
  ): TemplateResult<2>

  /**
   * Renders a selector input
   * The input may display a widget to facilitate selecting from a list of values
   * @param registered registered block this input is for
   * @param position position of the input field, relative to the content group (in svg units)
   * @param size size of the input field (in svg units)
   * @param widgetPosition position of the widget, relative to the root (global svg position)
   * @param values list of ids and values to select from
   * @param selected id of the currently selected value
   * @param onSelect function to call with the selected id when a value is selected
   */
  protected abstract renderInputSelector(
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

export type BlockRendererConstructorType = {
  new (
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget
  ): BaseBlockRenderer
}
