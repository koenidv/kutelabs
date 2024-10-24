export class SizeProps {
  heights: number[]
  widths: number[]

  constructor(heights: number[], widths: number[]) {
    this.heights = heights
    this.widths = widths
  }

  get fullHeight() {
    return this.heights.reduce((acc, h) => acc + h, 0)
  }
  get fullWidth() {
    return this.widths.reduce((acc, w) => acc + w, 0)
  }
}
