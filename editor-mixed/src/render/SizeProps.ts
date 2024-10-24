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

  get fullHeight() {
    return [...this.heights.values()].reduce((acc, h) => acc + h, 0)
  }
  get fullWidth() {
    return [...this.widths.values()].reduce((acc, w) => acc + w, 0)
  }
}
