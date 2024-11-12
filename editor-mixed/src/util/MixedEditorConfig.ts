import type { LayouterConstructorType } from "../render/Layouters/BaseLayouter"
import { DebugLayouter } from "../render/Layouters/DebugLayouter"
import type { BlockRendererConstructorType } from "../render/BlockRenderers/BaseBlockRenderer"
import { DebugBlockRenderer } from "../render/BlockRenderers/DebugBlockRenderer"
import type { DrawerRendererConstructorType } from "../render/DrawerRenderers/BaseDrawerRenderer"
import { DebugDrawerRenderer } from "../render/DrawerRenderers/DebugDrawerRenderer"
import type { DragRendererConstructorType } from "../render/DragRenderers/BaseDragRenderer"
import { DebugDragRenderer } from "../render/DragRenderers/DebugDragRenderer"
import type { ExtrasRendererInterface } from "../render/ExtrasRenderers.ts/ExtrasRendererInterface"
import { ExtrasRenderer } from "../render/ExtrasRenderers.ts/DefaultExtrasRenderer"

export type MixedEditorConfig = {
  layouter: LayouterConstructorType
  blockRenderer: BlockRendererConstructorType
  drawerRenderer: DrawerRendererConstructorType
  dragRenderer: DragRendererConstructorType
  extrasRenderer: { new (): ExtrasRendererInterface }
}

export const DebugMixedEditorConfig: MixedEditorConfig = {
  layouter: DebugLayouter,
  blockRenderer: DebugBlockRenderer,
  drawerRenderer: DebugDrawerRenderer,
  dragRenderer: DebugDragRenderer,
  extrasRenderer: ExtrasRenderer,
}
