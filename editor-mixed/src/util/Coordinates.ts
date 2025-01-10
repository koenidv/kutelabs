import type { AnyBlock } from "../blocks/Block"

export type BlockAndCoordinates = { block: AnyBlock; position: Coordinates }

export class Coordinates {
  readonly x: number
  readonly y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  static parse({ x, y }: { x: number; y: number }): Coordinates {
    return new Coordinates(x, y)
  }

  static add(...coordinates: Coordinates[]): Coordinates {
    return new Coordinates(
      coordinates.reduce((acc, curr) => acc + curr.x, 0),
      coordinates.reduce((acc, curr) => acc + curr.y, 0)
    )
  }

  static subtract(a: Coordinates, b: Coordinates): Coordinates {
    return new Coordinates(a.x - b.x, a.y - b.y)
  }

  static zero = new Coordinates(0, 0)
  static popOffset = new Coordinates(60, 60)

  static addPopOffset(coordinates: Coordinates): Coordinates {
    return Coordinates.add(coordinates, Coordinates.popOffset)
  }

  toArray(): [number, number] {
    return [this.x, this.y]
  }

  add(other: Coordinates): Coordinates {
    return new Coordinates(this.x + other.x, this.y + other.y)
  }
  plus(x: number, y: number): Coordinates {
    return new Coordinates(this.x + x, this.y + y)
  }

  toScreenCoordinates(workspace: SVGSVGElement): Coordinates {
    const ctm = workspace.getScreenCTM()!
    const bounds = workspace.getBoundingClientRect()
    const transformed = workspace
      .createSVGPoint()
      .also(it => {
        it.x = this.x
        it.y = this.y
      })
      .matrixTransform(ctm)
    return new Coordinates(transformed.x - bounds.left, transformed.y - bounds.top)
  }
}
