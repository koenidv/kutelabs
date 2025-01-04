export interface Point {
  x: number
  y: number
}

export interface Nook {
  width: number
  length: number
  mode: "inward" | "outward"
  pointing: "horizontal" | "vertical"
}

export interface Inset {
  width: number
  depth: number
}

export interface RectangleConfig {
  width: number
  height: number
  cornerRadius: number
}

export class RectBuilder {
  private config: RectangleConfig
  private features: ((Nook | Inset) & { position: Point })[] = []

  constructor(config: RectangleConfig) {
    this.config = config
  }

  public addToTop(feature: Nook | Inset, x: number): this {
    this.features.push({ ...feature, position: { x, y: 0 } })
    return this
  }
  public addToRight(feature: Nook | Inset, y: number): this {
    this.features.push({ ...feature, position: { x: this.config.width, y } })
    return this
  }
  public addToBottom(feature: Nook | Inset, x: number): this {
    this.features.push({ ...feature, position: { x, y: this.config.height } })
    return this
  }
  public addToLeft(feature: Nook | Inset, y: number): this {
    this.features.push({ ...feature, position: { x: 0, y } })
    return this
  }
  /**
   * The feature MUST be placed along an outer or inset edge or it will not be rendered
   * @param feature nook or inset to add
   * @param position position of the feature on an edge
   */
  public add(feature: Nook | Inset, position: Point): this {
    this.features.push({ ...feature, position })
    return this
  }

  generatePath(): string {
    const path: string[] = []
    const { width, height, cornerRadius } = this.config

    path.push(`M ${cornerRadius} 0`)
    // top
    this.drawEdge(path, { x: cornerRadius, y: 0 }, { x: width - cornerRadius, y: 0 })
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 ${width} ${cornerRadius}`)
    // right
    this.drawEdge(path, { x: width, y: cornerRadius }, { x: width, y: height - cornerRadius })
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 ${width - cornerRadius} ${height}`)
    // bottom
    this.drawEdge(path, { x: width - cornerRadius, y: height }, { x: cornerRadius, y: height })
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 0 ${height - cornerRadius}`)
    // left
    this.drawEdge(path, { x: 0, y: height - cornerRadius }, { x: 0, y: cornerRadius })
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} 0`)

    path.push("Z")
    return path.join(" ")
  }

  private drawEdge(path: string[], from: Point, to: Point) {
    const features = this.consumeOnLine(from, to)
    const transform = {
      x: to.x > from.x || to.y > from.y ? 1 : -1,
      y: to.y > from.y || to.x > from.x ? 1 : -1,
    }

    path.push(`L ${from.x} ${from.y}`)
    features.forEach(feature => {
      if ("mode" in feature) this.drawNook(path, feature as Nook & { position: Point }, transform)
      else this.drawInset(path, feature as Inset & { position: Point }, transform)
    }, this)
    path.push(`L ${to.x} ${to.y}`)
  }

  private drawNook(path: string[], nook: Nook & { position: Point }, transform: Point) {
    const modeFactor = nook.mode === "outward" ? -1 : 1
    if (nook.pointing === "vertical") {
      path.push(`L ${nook.position.x - (transform.y * nook.width) / 2} ${nook.position.y}`)
      path.push(`l ${(transform.y * nook.width) / 2} ${transform.x * modeFactor * nook.length}`)
      path.push(`l ${(transform.y * nook.width) / 2} ${transform.x * modeFactor * -nook.length}`)
    } else {
      path.push(`L ${nook.position.x} ${nook.position.y - (transform.x * nook.length) / 2}`)
      path.push(`l ${transform.y * modeFactor * -nook.length} ${(transform.x * nook.width) / 2}`)
      path.push(`l ${transform.y * modeFactor * nook.length} ${(transform.x * nook.width) / 2}`)
    }
  }

  private drawInset(path: string[], inset: Inset & { position: Point }, transform: Point) {
    if (transform.x != 1 && transform.y != 1) {
      console.error("Insets currently only support (+,-) transforms")
      return
    }
    path.push(`L ${inset.position.x} ${inset.position.y}`)
    let position1 = { x: inset.position.x + transform.x * -inset.depth, y: inset.position.y }
    this.drawEdge(path, inset.position, position1)
    const position2 = { x: position1.x, y: position1.y + transform.y * inset.width }
    this.drawEdge(path, position1, position2)
    const position3 = { x: position2.x + transform.x * inset.depth, y: position2.y }
    this.drawEdge(path, position2, position3)
  }

  private consumeOnLine(from: Point, to: Point) {
    const onLine: ((Nook | Inset) & { position: Point })[] = []
    ;[...this.features].forEach((feature, index) => {
      if (this.isPointOnLine(from, to, feature.position)) {
        onLine.push(feature)
        this.features.splice(index, 1)
      }
    })
    return onLine.sort((a, b) => {
      // all points share a line, sort along line
      return this.getDistance(from, a.position) - this.getDistance(from, b.position)
    })
  }

  private isPointOnLine(start: Point, end: Point, point: Point): boolean {
    const d1 = this.getDistance(start, point)
    const d2 = this.getDistance(point, end)
    const lineLength = this.getDistance(start, end)
    const buffer = 0.1 // float buffer

    return Math.abs(d1 + d2 - lineLength) < buffer
  }

  private getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }
}
