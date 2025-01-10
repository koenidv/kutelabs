import { svg, type TemplateResult } from "lit"
import type { AnyBlock } from "../../blocks/Block"
import { BlockType } from "../../blocks/configuration/BlockType"
import { ConnectorType } from "../../connections/ConnectorType"
import type { BlockRegistry } from "../../registries/BlockRegistry"
import type { AnyRegisteredBlock, RegisteredBlock } from "../../registries/RegisteredBlock"
import { Coordinates } from "../../util/Coordinates"
import type { BaseLayouter } from "../Layouters/BaseLayouter"
import type { BaseWidgetRenderer } from "../WidgetRenderers/BaseWidgetRenderer"
import type { BaseBlockInputRenderer } from "./BaseBlockInputRenderer"
import type { InternalBlockRenderProps, SvgResult } from "./BlockRendererTypes"
import { PropertiesBlockRenderer } from "./PropertiesBlockRenderer"

/**
 * The BlockRenderer is responsible for rendering blocks in the workspace.
 * It will also be called from other renderers to render blocks in different contexts.
 */
export abstract class BaseBlockRenderer extends PropertiesBlockRenderer {
  private readonly blockRegistry: BlockRegistry
  private readonly layouter: BaseLayouter

  protected abstract readonly inputRenderer: BaseBlockInputRenderer

  /* relay scaling to input renderer */
  public override setWorkspaceScaleFactor(value: number) {
    super.setWorkspaceScaleFactor(value)
    this.inputRenderer.setWorkspaceScaleFactor(value)
  }

  constructor(
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget,
    requestUpdate: () => void
  ) {
    super(setWidget, requestUpdate)
    this.blockRegistry = blockRegistry
    this.layouter = layouter
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

}

export type BlockRendererConstructorType = {
  new (
    blockRegistry: BlockRegistry,
    layouter: BaseLayouter,
    setWidget: typeof BaseWidgetRenderer.prototype.setWidget,
    requestUpdate: () => void
  ): BaseBlockRenderer
}
