import type { BlockRendererConstructorType } from "../render/BlockRenderers/BaseBlockRenderer"
import { DebugBlockRenderer } from "../render/BlockRenderers/DebugBlockRenderer"
import { KuteBlockRenderer } from "../render/BlockRenderers/KuteBlockRenderer"
import type { DragRendererConstructorType } from "../render/DragRenderers/BaseDragRenderer"
import { DebugDragRenderer } from "../render/DragRenderers/DebugDragRenderer"
import type { DrawerRendererConstructorType } from "../render/DrawerRenderers/BaseDrawerRenderer"
import { DebugDrawerRenderer } from "../render/DrawerRenderers/DebugDrawerRenderer"
import { KuteDrawerRenderer } from "../render/DrawerRenderers/KuteDrawerRenderer"
import { ExtrasRenderer } from "../render/ExtrasRenderers.ts/DefaultExtrasRenderer"
import type { ExtrasRendererInterface } from "../render/ExtrasRenderers.ts/ExtrasRendererInterface"
import type { LayouterConstructorType } from "../render/Layouters/BaseLayouter"
import { DebugLayouter } from "../render/Layouters/DebugLayouter"
import { KuteLayouter } from "../render/Layouters/KuteLayouter"
import type { WidgetRendererConstructorType } from "../render/WidgetRenderers/BaseWidgetRenderer"
import { DebugWidgetRenderer } from "../render/WidgetRenderers/DebugWidgetRenderer"
import { KuteWidgetRenderer } from "../render/WidgetRenderers/KuteWidgetRenderer"

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

export const DefaultMixedEditorConfig: MixedEditorConfig = {
  layouter: KuteLayouter,
  blockRenderer: KuteBlockRenderer,
  drawerRenderer: KuteDrawerRenderer,
  widgetRenderer: KuteWidgetRenderer,
  dragRenderer: DebugDragRenderer,
  extrasRenderer: ExtrasRenderer,
}
