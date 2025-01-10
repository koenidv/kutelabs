import type { TemplateResult } from "lit"

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