import type { AnyBlock } from "../blocks/Block"
import { DrawerBlock } from "../blocks/DrawerBlock"
import type { BlockRegistry } from "./BlockRegistry"

/**
 * @class WorkspaceStateHelper
 * @classdesc Helper class to determine if a block was added or removed from the workspace
 * This class keeps track of which block was last disconnected and not yet connected (e.g. is being dragged) to check if it was already in the workspace before being connected
 */
export class WorkspaceStateHelper {
  private emit: typeof BlockRegistry.prototype.emit

  // there should never be more than one pending block
  private pendingInWorkspace: AnyBlock | null = null

  constructor(emit: typeof BlockRegistry.prototype.emit) {
    this.emit = emit
  }

  onConnecting(block: AnyBlock, to: AnyBlock): void {
    // currently, moving blocks to the drawer is the only way to remove them from the workspace
    if (to instanceof DrawerBlock) {
      if (this.pendingInWorkspace === block) {
        this.emit("workspaceRemoved", { block })
      }
    } else if (this.pendingInWorkspace !== block) {
      this.pendingInWorkspace = null
      this.emit("workspaceAdded", { block })
    }
    this.pendingInWorkspace = null
  }

  onDisconnecting(block: AnyBlock, from: AnyBlock): void {
    if (from instanceof DrawerBlock || from.isInDrawer) return
    if (this.pendingInWorkspace)
      console.warn("Overwriting pending in-workspace block", this.pendingInWorkspace, "with", block)
    this.pendingInWorkspace = block
  }
}
