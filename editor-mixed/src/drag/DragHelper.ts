import type { Ref } from "lit/directives/ref.js"
import type { AnyBlock } from "../blocks/Block"
import { Connection } from "../connections/Connection"
import { BlockRegistry } from "../registries/BlockRegistry"
import { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { type AnyRegisteredBlock } from "../registries/RegisteredBlock"
import type { BaseDragRenderer } from "../render/DragRenderers/BaseDragRenderer"
import { Coordinates } from "../util/Coordinates"
import { findShadowedActiveElement, focusBlockElement, srAnnounce } from "../util/DOMUtils"

/**
 * Helper class to manage the dragging of blocks in the workspace by mouse, touch, or keyboard.
 */
export class DragHelper {
  private readonly blockRegistry: BlockRegistry
  private readonly connectorRegistry: ConnectorRegistry
  private readonly renderer: BaseDragRenderer
  private readonly workspaceRef: Ref<SVGSVGElement>
  private readonly drawerRef: Ref<SVGSVGElement>
  private readonly requestRerender: (full: boolean) => void
  private readonly removeWidgets: () => void

  constructor(
    blockRegistry: BlockRegistry,
    connectorRegistry: ConnectorRegistry,
    renderer: BaseDragRenderer,
    workspaceRef: Ref<SVGSVGElement>,
    drawerRef: Ref<SVGSVGElement>,
    rerenderDrag: () => void,
    rerenderWorkspace: () => void,
    removeWidgets: () => void
  ) {
    this.blockRegistry = blockRegistry
    this.connectorRegistry = connectorRegistry
    this.renderer = renderer
    this.workspaceRef = workspaceRef
    this.drawerRef = drawerRef
    this.requestRerender = (full: boolean) => {
      rerenderDrag()
      if (full) rerenderWorkspace()
    }
    this.removeWidgets = removeWidgets
  }
  private dragged: AnyRegisteredBlock | null = null
  private startPos = Coordinates.zero
  private dragX = 0
  private dragY = 0
  private currentTouchX = 0
  private currentTouchY = 0

  //#region Start Drag

  /**
   * Starts the dragging process for a block element on mouse or touch events.
   * This will detach the dragged block from its current position and prepare the drag renderer.
   * @param evt Mouse or touch start event
   */
  startDrag(evt: MouseEvent | TouchEvent) {
    if (evt.defaultPrevented) return
    if (evt instanceof MouseEvent && evt.button != 0) return
    if (typeof TouchEvent != "undefined" && evt instanceof TouchEvent && evt.touches.length != 1)
      return
    if (!this.workspaceRef.value) throw new Error("Workspace not initialized")
    this.removeWidgets()

    const draggedParent = this.findParent(
      evt.target as HTMLElement,
      it => it.classList.contains("dragable"),
      it => it.classList.contains("donotdrag")
    )
    if (draggedParent == null) return
    this.dragged = this.getDraggedData(draggedParent)?.registered ?? null
    if (this.dragged == null) return
    evt.preventDefault()

    this.startPos = this.determineBlockStartPosition(this.dragged, draggedParent)

    if (typeof TouchEvent != "undefined" && evt instanceof TouchEvent) this.handleTouchStart(evt)

    this.afterDrag(this.dragged, this.dragX, this.dragY, true)
    this.workspaceRef.value.style.cursor = "grabbing"
  }

  /**
   * Additional logic to start the dragging process for touch events
   * This will bind move and end events to the current target as renders would break the drag otherwise.
   * @param evt Touch start event
   */
  private handleTouchStart(evt: TouchEvent) {
    this.currentTouchX = evt.touches[0].clientX
    this.currentTouchY = evt.touches[0].clientY
    // attaching touch events to the target as they would break on rerender
    // see https://stackoverflow.com/questions/33298828/touch-move-event-dont-fire-after-touch-start-target-is-removed
    const onTouchMove = this.touchDrag.bind(this) as EventListener
    const onTouchEnd = ((e: TouchEvent) => {
      evt.target?.removeEventListener("touchmove", onTouchMove)
      evt.target?.removeEventListener("touchend", onTouchEnd)
      evt.target?.removeEventListener("touchcancel", onTouchEnd)
      this.endDrag(e)
    }).bind(this) as EventListener
    evt.target!.addEventListener("touchmove", onTouchMove)
    evt.target!.addEventListener("touchend", onTouchEnd)
    evt.target!.addEventListener("touchcancel", onTouchEnd)
  }

  /**
   * Retrieves the dragged block from the parent element of the dragged element sets it as detached
   * @param draggableParent target element of the drag start event
   * @returns dragged block or null if not found
   */
  private getDraggedData(draggableParent: HTMLElement | null): {
    registered: AnyRegisteredBlock
    previousUpstream: AnyBlock | null
    previousConnection: Connection | null
  } | null {
    if (draggableParent == null) return null
    const blockId = draggableParent.id.replace("block-", "")
    const registered = this.blockRegistry.getRegisteredById(blockId)
    if (registered == null) return null

    const previousUpstream = registered.block.upstream
    const previousUpstreamConnector = registered.block.upstreamConnectorInUse
    const previousUpstreamConnectedTo = previousUpstream?.connectedBlocks.byBlock(registered.block)
    const previousConnection =
      previousUpstreamConnector && previousUpstreamConnectedTo
        ? new Connection(previousUpstreamConnector, previousUpstreamConnectedTo)
        : null

    const poppedBlock = registered.block.disconnectSelf(this.blockRegistry)
    this.blockRegistry.setDetached(poppedBlock)
    if (poppedBlock != registered.block) {
      return {
        registered: this.blockRegistry.getRegistered(poppedBlock),
        previousUpstream,
        previousConnection,
      }
    }
    return { registered, previousUpstream, previousConnection }
  }

  /**
   * Adjusts the current drag delta for blocks moved from the drawer
   * @param block currently dragged block
   * @param target target element in drag start event
   * @returns global position of the block, with a side effect on dragX and dragY
   */
  private determineBlockStartPosition(block: AnyRegisteredBlock, target: HTMLElement): Coordinates {
    if (!block.block.isInDrawer) return block.globalPosition

    // let drag vector point from actual workspace position drawer-space position
    // connector selection relies on this offset because connector positions are not recalculated during drag
    const ctm = this.workspaceRef.value!.getScreenCTM()!

    this.dragX = (target.getBoundingClientRect().x - ctm.e) / ctm.a - block.globalPosition.x
    this.dragY = (target.getBoundingClientRect().y - ctm.f) / ctm.d - block.globalPosition.y
    return block.globalPosition
  }

  //#region Update Drag

  /**
   * Updates the drag process with the current mouse position and
   * performs after-drag operations like snap point selection and rerendering, see {@link afterDrag}.
   * @param evt Mouse move event
   */
  drag(evt: MouseEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    const ctm = this.workspaceRef.value!.getScreenCTM()!
    this.dragX += evt.movementX / ctm.a
    this.dragY += evt.movementY / ctm.d

    this.afterDrag(this.dragged, this.dragX, this.dragY)
  }

  /**
   * Updates the drag process with the current touch position and
   * performs after-drag operations like snap point selection and rerendering, see {@link afterDrag}.
   * This should be called on touchmove events.
   * @param evt Touch move event
   */
  touchDrag(evt: TouchEvent) {
    if (!this.dragged || evt.touches.length != 1) return
    evt.preventDefault()

    const ctm = this.workspaceRef.value!.getScreenCTM()!
    this.dragX += (evt.touches[0].clientX - this.currentTouchX) / ctm.a
    this.dragY += (evt.touches[0].clientY - this.currentTouchY) / ctm.d

    this.currentTouchX = evt.touches[0].clientX
    this.currentTouchY = evt.touches[0].clientY

    this.afterDrag(this.dragged, this.dragX, this.dragY, false)
  }

  /**
   * Checks for nearby snappable connectors for the given dragged block and updates the drag renderer.
   * @param dragged currently dragged block
   * @param dragX drag delta since start in x
   * @param dragY drag delta since start in y
   * @param fullUpdate will request to rerender workspace and draglayer if true, only draglayer otherwise
   */
  private afterDrag(dragged: AnyRegisteredBlock, dragX: number, dragY: number, fullUpdate = false) {
    const snap = this.connectorRegistry.selectConnectorForBlock(
      dragged.block,
      new Coordinates(dragX, dragY),
      25
    )

    this.renderer.update(
      dragged,
      Coordinates.add(this.startPos, new Coordinates(dragX, dragY)),
      snap
    )

    this.requestRerender(fullUpdate)
  }

  //#region Finalize Drag

  /**
   * This is called when a mouse or touch trag event ends.
   * It will determine if the dragged block is dropped on the drawer or close to a snappable connector,
   * then attach the block accordingly and reset the process.
   * @param evt Mouse or touch event to determine the drop position
   */
  endDrag(evt: MouseEvent | TouchEvent) {
    if (!this.dragged) return
    evt.preventDefault()

    let droppedOnDrawer = false

    if (typeof TouchEvent != "undefined" && evt instanceof TouchEvent) {
      /* Because of the touch event rerender fix we applied at touchstart, the event's target will be the invisible cloned element.
       * Thus we cannot check if the target is within the drawer, but we have to compare touch position and drawer bounds. */
      droppedOnDrawer = this.testTouchInDrawer(this.currentTouchX, this.currentTouchY)
    } else {
      droppedOnDrawer = this.findParent(evt.target as HTMLElement, it => it.id == "drawer") != null
    }

    if (droppedOnDrawer) {
      this.blockRegistry.attachToDrawer(this.dragged.block)
    } else {
      const snap = this.connectorRegistry.selectConnectorForBlock(
        this.dragged.block,
        new Coordinates(this.dragX, this.dragY),
        25
      )
      this.insertOnSnap(this.dragged, snap)
    }

    this.reset()
    this.workspaceRef.value!.style.cursor = "unset"
    this.requestRerender(true)
  }

  /**
   * Attaches a dragged block to a snap point, if any, or the workspace root connector.
   * @param dragged dragged block
   * @param snap snap point to attach to, or null to attach to the root connector
   */
  private insertOnSnap(dragged: AnyRegisteredBlock, snap: Connection | null) {
    const connectOnBlock = snap?.to.parentBlock ?? this.blockRegistry.root!
    const snapOnConnection =
      snap ??
      new Connection(this.blockRegistry.root!.rootConnector, dragged.block.connectors.internal)

    connectOnBlock.connect(
      this.blockRegistry,
      dragged.block,
      snapOnConnection,
      Coordinates.add(this.startPos, new Coordinates(this.dragX, this.dragY))
    )
  }

  /**
   * Resets the drag process
   */
  private reset() {
    this.dragged = null
    this.blockRegistry.setDetached(null)
    this.renderer.remove()
    this.startPos = Coordinates.zero
    this.dragX = this.dragY = 0
    this.currentTouchX = this.currentTouchY = 0
  }

  //#region Utils

  /**
   * Finds the first parent of an element that matches a predicate and does not match a break condition.
   * This is used to find the block element that is being dragged or the drawer element.
   * @param element leaf element to start the search from
   * @param predicate condition to match the parent element
   * @param breakCondition the search will stop if this is defined and the condition is met
   * @returns first matching element, null if none is found
   */
  private findParent(
    element: HTMLElement | null,
    predicate: (it: HTMLElement) => boolean,
    breakCondition?: (it: HTMLElement) => boolean
  ): HTMLElement | null {
    if (!element) return null
    if (breakCondition?.(element)) return null
    if (predicate(element)) return element
    return this.findParent(element.parentElement, predicate, breakCondition)
  }

  /**
   * Tests if a position is within the referenced drawer bounds
   */
  private testTouchInDrawer(x: number, y: number): boolean {
    const bounds = this.drawerRef.value?.querySelector("#drawer")?.getBoundingClientRect()
    if (!bounds) {
      console.error("Drawer bounds not found")
      return false
    }
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
  }

  //#region Keyboard Interaction

  private availableIterableConnectionsList: Connection[] = []
  private interableConnectionsForBlockId: string | null = null
  private currentIterableConnectionIndex = 1
  private resetIterableConnectors = () => {
    this.availableIterableConnectionsList = []
    this.interableConnectionsForBlockId = null
    this.currentIterableConnectionIndex = 0 // starting at index 1; 0 is the previous connection
  }

  /**
   * Use the keyboard to dis/connect blocks.
   * available keys:
   * - j: connect to next free compatible connector
   * - k: disconnect and attach to root
   * - l: disconnect and attach to drawer
   * @param evt Keyboard event on the editor (needs to include workspace and drawer)
   * @returns
   */
  onKeydown(evt: KeyboardEvent) {
    if (evt.defaultPrevented) return

    if (evt.key != "j") this.resetIterableConnectors()

    switch (evt.key) {
      case "j":
        this.handleKeyboardInteraction(evt, this.connectToNextFreeConnector.bind(this), true)
        break
      case "k":
        this.handleKeyboardInteraction(evt, this.connectToRoot.bind(this))
        break
      case "l":
        this.handleKeyboardInteraction(evt, this.connectToDrawer.bind(this))
        break
    }
  }

  /**
   * Connects the block to the next free compatible connector
   * @param block block to connect
   * @param cancel function to cancel the drag operation
   */
  private connectToNextFreeConnector(
    block: AnyBlock,
    upstream: AnyBlock | null,
    cancel: () => void
  ) {
    if (block.id != this.interableConnectionsForBlockId) {
      this.resetIterableConnectors()
      this.availableIterableConnectionsList =
        this.connectorRegistry.listUpstreamFreeConnections(block)
      this.interableConnectionsForBlockId = block.id
    }

    if (this.availableIterableConnectionsList.length == 0) {
      if (upstream && "drawerConnector" in upstream) {
        this.blockRegistry.attachToRoot(block, pos => new Coordinates(400, 400))
        setTimeout(() => focusBlockElement(this.workspaceRef, block.id))
        srAnnounce(
          this.workspaceRef,
          "Block added to workspace" + block.connectors.before
            ? ", no available unoccupied connectors for this block."
            : "."
        )
        return
      } else {
        srAnnounce(this.workspaceRef, "No available unoccupied connectors for this block")
        return cancel()
      }
    }
    if (this.currentIterableConnectionIndex >= this.availableIterableConnectionsList.length)
      this.currentIterableConnectionIndex = 0

    const nextConnection =
      this.availableIterableConnectionsList[this.currentIterableConnectionIndex++]

    if (!nextConnection.to.parentBlock) {
      console.error("Connection without parent block")
      return cancel()
    }
    nextConnection.to.parentBlock.connect(this.blockRegistry, block, nextConnection)
    setTimeout(() => focusBlockElement(this.workspaceRef, block.id))
    srAnnounce(
      this.workspaceRef,
      `Connected to ${nextConnection.to.parentBlock.type} block on its ${nextConnection.to.type} ${nextConnection.to.role} connector. Focus remains.`
    )
  }

  /**
   * Connects the block to the workspace root
   * @param block block to connect
   * @param upstream previous upstream block
   */
  private connectToRoot(block: AnyBlock, upstream: AnyBlock | null) {
    this.blockRegistry.attachToRoot(block, curr => {
      return Coordinates.addPopOffset(curr)
    })
    focusBlockElement(this.workspaceRef, upstream?.id ?? block.id)
    srAnnounce(
      this.workspaceRef,
      upstream
        ? `Focus on previous block. ${block.type} block and connected blocks disconnected and remain in workspace.`
        : `Focus on next workspace block stack. Previous stack is now disconnected and remains in workspace.`
    )
  }

  /**
   * Connects the block to the drawer
   * @param block block to connect
   * @param upstream previous upstream block
   */
  private connectToDrawer(block: AnyBlock, upstream: AnyBlock | null) {
    this.blockRegistry.attachToDrawer(block)
    if (upstream) {
      focusBlockElement(this.workspaceRef, upstream.id)
      srAnnounce(
        this.workspaceRef,
        `Focus on previous block. ${block.type} block and connected blocks returned to drawer.`
      )
    } else {
      this.workspaceRef.value?.focus()
      srAnnounce(
        this.workspaceRef,
        `Focus on next workspace block stack. ${block.type} block and connected blocks returned to drawer.`
      )
    }
  }

  /**
   * Gets the currently selected blocks and executes an action on it.
   * This also requests a full rerender of the workspace and drag layer to update the visuals.
   * Important: The action MUST attach the popped block somewhere or call cancel, floating nodes are not allowed.
   * @param evt Keyboard event to prevent default
   * @param action action to execute on the block
   * @returns void
   */
  private handleKeyboardInteraction(
    evt: KeyboardEvent,
    action: (block: AnyBlock, previousUpstream: AnyBlock | null, cancel: () => void) => void,
    allowDrawer = false
  ) {
    const it = this.popFocussedBlock()
    if (!it || (!allowDrawer && it.registered.block.isInDrawer)) return
    const {
      registered: { block },
      previousUpstream,
      previousConnection,
    } = it
    evt.preventDefault()

    const reattach = () => {
      if (!previousUpstream) return
      if (previousConnection) {
        previousUpstream.connect(this.blockRegistry, block, previousConnection)
      } else if ("rootConnector" in previousUpstream) {
        this.blockRegistry.attachToRoot(block, pos => pos)
      } else if ("drawerConnector" in previousUpstream) {
        this.blockRegistry.attachToDrawer(block)
      } else {
        console.error("Previous block could not be reattached")
      }
    }

    action(block, previousUpstream, reattach.bind(this))

    this.requestRerender(true)
  }

  /**
   * Finds the currently focussed element within the editor and pops the block if it is a block element.
   * @returns block data and previous upstream block if found, null otherwise
   */
  private popFocussedBlock(): {
    registered: AnyRegisteredBlock
    previousUpstream: AnyBlock | null
    previousConnection: Connection | null
  } | null {
    const focussedElement = findShadowedActiveElement(document)
    if (!focussedElement) return null
    if (!focussedElement?.classList.contains("block-container")) return null
    return this.getDraggedData(
      this.findParent(
        focussedElement as HTMLElement,
        it => it.classList.contains("dragable"),
        it => it.classList.contains("donotdrag")
      )
    )
  }
}
