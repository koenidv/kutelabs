import type { AnyBlock } from "../blocks/Block";

export enum HeightProp {
  Head,
  Body,
  BodyIntermediary,
  BodySecondary,
  Tail,
}

export enum WidthProp {
  Left,
  Right,
}

export type BlockAndSize = { block: AnyBlock; size: SizeProps }

export class SizeProps {
  heights: Map<HeightProp, number>
  widths: Map<WidthProp, number>

  constructor(
    heights: Map<HeightProp, number>,
    widths: Map<WidthProp, number>
  ) {
    this.heights = heights
    this.widths = widths
  }

  static empty() {
    return new SizeProps(new Map(), new Map())
  }

  static simple(height: number, width: number) {
    return new SizeProps(
      new Map([[HeightProp.Head, height]]),
      new Map([[WidthProp.Left, width]])
    )
  }

  addHeight(prop: HeightProp, value: number) {
    this.heights.set(prop, value)
  }

  addWidth(prop: WidthProp, value: number) {
    this.widths.set(prop, value)
  }

  get fullHeight() {
    return [...this.heights.values()].reduce((acc, h) => acc + h, 0)
  }
  get fullWidth() {
    return [...this.widths.values()].reduce((acc, w) => acc + w, 0)
  }
}
