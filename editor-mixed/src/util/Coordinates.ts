export class Coordinates {
  readonly x: number
  readonly y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
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

  static zero = { x: 0, y: 0 }
  static popOffset = { x: 50, y: 50 }

  static addPopOffset(coordinates: Coordinates) {
    if (coordinates === null || coordinates === undefined) return null
    return Coordinates.add(coordinates, Coordinates.popOffset)
  }
}
