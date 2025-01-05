export interface Point {
  x: number
  y: number
}

export interface Nook {
  width: number
  length: number
  mode: "inward" | "outward"
  pointing: "horizontal" | "vertical"
  pointRadius?: number
  baseRadius?: number
}

export interface Inset {
  width: number
  depth: number
  openRadius?: number
  innerRadius?: number
}

export interface Rectangle {
  width: number
  height: number
  radius: number
}

export class RectBuilder {
  private config: Rectangle
  private features: ((Nook | Inset) & { position: Point })[] = []

  constructor(config: Rectangle) {
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
    const { width, height, radius: cornerRadius } = this.config

    path.push(`M ${cornerRadius} 0`)
    // top
    this.drawEdge(path, { x: cornerRadius, y: 0 }, { x: width - cornerRadius, y: 0 })
    this.drawCorner(path, { x: width, y: cornerRadius }, cornerRadius)
    // right
    this.drawEdge(path, { x: width, y: cornerRadius }, { x: width, y: height - cornerRadius })
    this.drawCorner(path, { x: width - cornerRadius, y: height }, cornerRadius)
    // bottom
    this.drawEdge(path, { x: width - cornerRadius, y: height }, { x: cornerRadius, y: height })
    this.drawCorner(path, { x: 0, y: height - cornerRadius }, cornerRadius)
    // left
    this.drawEdge(path, { x: 0, y: height - cornerRadius }, { x: 0, y: cornerRadius })
    this.drawCorner(path, { x: cornerRadius, y: 0 }, cornerRadius)

    path.push("Z")
    if (this.features.length > 0)
      console.warn("RectBuilder: not all features were placed", this.features)
    return path.join(" ")
  }

  private drawCorner(
    path: string[],
    point: Point,
    radius: number | undefined,
    overrideProps: { relative?: boolean; sweep?: boolean } = {}
  ) {
    const props = { relative: false, sweep: true, ...overrideProps }
    if (!radius) return path.push(`${props.relative ? "l" : "L"} ${point.x} ${point.y}`)
    path.push(
      `${props.relative ? "a" : "A"} ${radius} ${radius} 0 0 ${props.sweep ? "1" : "0"} ${point.x} ${point.y}`
    )
  }

  private drawQuadratic(
    path: string[],
    to: Point,
    control: Point,
    overrideProps: { relative?: boolean } = {}
  ) {
    const props = { relative: false, ...overrideProps }
    path.push(`${props.relative ? "q" : "Q"} ${control.x} ${control.y} ${to.x} ${to.y}`)
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

  /**
   * Add a nook to the path, inward or outward, vertical or horizontal
   * @param path svg path elements to append nook to
   * @param nook nook to draw
   * @param transform transform matrix of the edge (1,1 for →↓, -1,-1 for ←↑, etc)
   */
  private drawNook(path: string[], nook: Nook & { position: Point }, transform: Point) {
    if ((nook.pointRadius ?? 0) > nook.width)
      console.warn("Nook point radius should not be larger than its width")

    const modeFactor = nook.mode === "outward" ? -1 : 1
    const vertical = nook.pointing === "vertical"

    const baseRadius = {
      x: vertical && nook.baseRadius ? nook.baseRadius * transform.x : 0,
      y: !vertical && nook.baseRadius ? nook.baseRadius * transform.y : 0,
    }

    const pointRadius = {
      x: vertical && nook.pointRadius ? nook.pointRadius * transform.x : 0,
      y: !vertical && nook.pointRadius ? nook.pointRadius * transform.y : 0,
    }

    const hypo = {
      x: (vertical ? nook.width / 2 : nook.length * -modeFactor) * transform.x,
      y: (vertical ? nook.length * modeFactor : nook.width / 2) * transform.y,
    }
    const hypoLength = Math.sqrt(hypo.x ** 2 + hypo.y ** 2)
    const hypoReverseMatrix = { x: vertical ? 1 : -1, y: vertical ? -1 : 1 }

    const base = {
      x: (vertical ? nook.width : 0) * transform.x,
      y: (vertical ? 0 : nook.width) * transform.y,
    }

    const baseHeightFactor = Math.abs((baseRadius.x || baseRadius.y) / hypoLength)
    const pointHeightFactor = Math.abs((pointRadius.x || pointRadius.y) / hypoLength)

    //base start
    path.push(
      `L ${nook.position.x - base.x / 2 - baseRadius.x * 2} ${nook.position.y - base.y / 2 - baseRadius.y * 2}`
    )
    if (baseRadius) {
      this.drawQuadratic(
        path,
        {
          x: baseRadius.x + baseHeightFactor * hypo.x,
          y: baseRadius.y + baseHeightFactor * hypo.y,
        },
        { x: baseRadius.x, y: baseRadius.y },
        { relative: true }
      )
    }

    //point
    path.push(
      `l ${hypo.x - (baseHeightFactor + pointHeightFactor) * hypo.x} ${hypo.y - (baseHeightFactor + pointHeightFactor) * hypo.y}`
    )
    if (pointRadius) {
      this.drawQuadratic(
        path,
        {
          x: pointHeightFactor * (hypo.x + hypo.x * hypoReverseMatrix.x),
          y: pointHeightFactor * (hypo.y + hypo.y * hypoReverseMatrix.y),
        },
        { x: pointHeightFactor * hypo.x, y: pointHeightFactor * hypo.y },
        { relative: true }
      )
    }

    //base end
    path.push(
      `l ${(hypo.x - (baseHeightFactor + pointHeightFactor) * hypo.x) * hypoReverseMatrix.x} ${(hypo.y - (baseHeightFactor + pointHeightFactor) * hypo.y) * hypoReverseMatrix.y}`
    )
    if (baseRadius) {
      this.drawQuadratic(
        path,
        {
          x: (baseRadius.x + baseHeightFactor * hypo.x) * hypoReverseMatrix.x,
          y: (baseRadius.y + baseHeightFactor * hypo.y) * hypoReverseMatrix.y,
        },
        {
          x: baseHeightFactor * hypo.x * hypoReverseMatrix.x,
          y: baseHeightFactor * hypo.y * hypoReverseMatrix.y,
        },
        { relative: true }
      )
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

  private consumeOnLine(from: Point, to: Point): ((Nook | Inset) & { position: Point })[] {
    const onLine = this.features.filter(feature => this.isPointOnLine(from, to, feature.position))
    this.features = this.features.filter(feature => !onLine.includes(feature))
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
