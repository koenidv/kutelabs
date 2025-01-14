import type { AnyBlock } from "../blocks/Block"

export enum HeightProp {
  Head,
  Body,
  Intermediate,
  CutRow,
  Tail,
}

export enum WidthProp {
  Left,
  Middle,
  Right,
}

export type BlockAndSize = { block: AnyBlock; size: SizeProps }

export class SizeProps {
  heights: { prop: HeightProp; value: number }[]
  widths: { prop: WidthProp; value: number }[]

  constructor(
    heights: { prop: HeightProp; value: number }[],
    widths: { prop: WidthProp; value: number }[]
  ) {
    this.heights = heights
    this.widths = widths
  }

  static empty() {
    return new SizeProps([], [])
  }

  static simple(height: number, width: number) {
    return new SizeProps(
      [{ prop: HeightProp.Head, value: height }],
      [{ prop: WidthProp.Left, value: width }]
    )
  }

  static get zero() {
    return new SizeProps([], [])
  }

  addHeight(prop: HeightProp, value: number) {
    this.heights.push({ prop, value })
  }

  addWidth(prop: WidthProp, value: number) {
    this.widths.push({ prop, value })
  }

  byProp<T extends HeightProp | WidthProp>(list: { prop: T; value: number }[], prop: T) {
    return list.filter(h => h.prop == prop).map(h => h.value)
  }

  get fullHeight() {
    return this.heights.reduce((acc, h) => acc + h.value, 0)
  }

  get heads(): number[] {
    return this.byProp(this.heights, HeightProp.Head)
  }
  get fullHeadHeight() {
    return this.heads.reduce((acc, h) => acc + h, 0)
  }
  get bodiesAndIntermediates(): { prop: HeightProp; value: number }[] {
    return this.heights.filter(h => h.prop == HeightProp.Body || h.prop == HeightProp.Intermediate)
  }
  get cutRows(): number[] {
    return this.byProp(this.heights, HeightProp.CutRow)
  }
  get tails(): number[] {
    return this.byProp(this.heights, HeightProp.Tail)
  }
  get fullTailHeight() {
    return this.tails.reduce((acc, h) => acc + h, 0)
  }

  get fullWidth() {
    return this.widths.reduce((acc, w) => acc + w.value, 0)
  }

  get leftWidth() {
    return this.byProp(this.widths, WidthProp.Left).reduce((acc, w) => acc + w, 0)
  }
  get middleWidth() {
    return this.byProp(this.widths, WidthProp.Middle).reduce((acc, w) => acc + w, 0)
  }
  get rightWidth() {
    return this.byProp(this.widths, WidthProp.Right).reduce((acc, w) => acc + w, 0)
  }
}
