import type { BlockRendererConstructorType } from "../render/BlockRenderers/BaseBlockRenderer"
import { DebugBlockRenderer } from "../render/BlockRenderers/DebugBlockRenderer"
import type { DragRendererConstructorType } from "../render/DragRenderers/BaseDragRenderer"
import { DebugDragRenderer } from "../render/DragRenderers/DebugDragRenderer"
import type { DrawerRendererConstructorType } from "../render/DrawerRenderers/BaseDrawerRenderer"
import { DebugDrawerRenderer } from "../render/DrawerRenderers/DebugDrawerRenderer"
import { ExtrasRenderer } from "../render/ExtrasRenderers.ts/DefaultExtrasRenderer"
import type { ExtrasRendererInterface } from "../render/ExtrasRenderers.ts/ExtrasRendererInterface"
import type { LayouterConstructorType } from "../render/Layouters/BaseLayouter"
import { DebugLayouter } from "../render/Layouters/DebugLayouter"
import type { WidgetRendererConstructorType } from "../render/WidgetRenderers/BaseWidgetRenderer"
import { DebugWidgetRenderer } from "../render/WidgetRenderers/DebugWidgetRenderer"

export type MixedEditorConfig = {
  layouter: LayouterConstructorType
  blockRenderer: BlockRendererConstructorType
  drawerRenderer: DrawerRendererConstructorType
  widgetRenderer: WidgetRendererConstructorType
  dragRenderer: DragRendererConstructorType
  extrasRenderer: { new (): ExtrasRendererInterface }
}

export const DebugMixedEditorConfig: MixedEditorConfig = {
  layouter: DebugLayouter,
  blockRenderer: DebugBlockRenderer,
  drawerRenderer: DebugDrawerRenderer,
  widgetRenderer: DebugWidgetRenderer,
  dragRenderer: DebugDragRenderer,
  extrasRenderer: ExtrasRenderer,
}
