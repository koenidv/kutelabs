export interface Point {
  x: number
  y: number
}

export interface Nook {
  position: Point
  width: number
  length: number
  mode: "inward" | "outward"
  pointing: "horizontal" | "vertical"
  pointRadius?: number
  baseRadius?: number
}

export interface Inset {
  position: Point
  width: number
  depth: number
  openRadius?: number
  innerRadius?: number
}

export interface Cutout {
  position: Point
  width: number
  height: number
  radius: number
}

export interface Rectangle {
  width: number
  height: number
  radius: number
  offset?: Point
}

type AddFeatureType = Omit<Nook, "position"> | Omit<Inset, "position">

export class RectBuilder {
  private container: Rectangle
  private features: (Nook | Inset)[] = []
  private cutouts: Cutout[] = []

  constructor(config: Rectangle) {
    this.container = config
  }

  public addToTop(feature: AddFeatureType, x: number): this {
    this.features.push({
      ...feature,
      position: { x: x + (this.container.offset?.x ?? 0), y: this.container.offset?.y ?? 0 },
    })
    return this
  }
  public addToRight(feature: AddFeatureType, y: number): this {
    this.features.push({
      ...feature,
      position: {
        x: this.container.width + (this.container.offset?.x ?? 0),
        y: y + (this.container.offset?.y ?? 0),
      },
    })
    return this
  }
  public addToBottom(feature: AddFeatureType, x: number): this {
    this.features.push({
      ...feature,
      position: {
        x: x + (this.container.offset?.x ?? 0),
        y: this.container.height + (this.container.offset?.y ?? 0),
      },
    })
    return this
  }
  public addToLeft(feature: AddFeatureType, y: number): this {
    this.features.push({
      ...feature,
      position: { x: this.container.offset?.x ?? 0, y: y + (this.container.offset?.y ?? 0) },
    })
    return this
  }
  /**
   * The feature MUST be placed along an outer or inset edge or it will not be rendered
   * @param feature nook or inset to add
   * @param position position of the feature on an edge
   */
  public add(feature: AddFeatureType | Omit<Cutout, "position">, position: Point): this {
    if ("radius" in feature) this.cutouts.push({ ...feature, position })
    else this.features.push({ ...feature, position })
    return this
  }

  generatePath(): string {
    const path: string[] = []
    const { width, height, radius } = this.container
    const offset = this.container.offset ?? { x: 0, y: 0 }

    this.drawRect(path, offset, { x: width, y: height }, radius)

    this.cutouts.forEach(({ position, width, height, radius }) =>
      this.drawRect(path, position, { x: width, y: height }, radius)
    )

    if (this.features.length > 0)
      console.warn("RectBuilder: not all features were placed", this.features)
    return path.join(" ")
  }

  private drawRect(path: string[], position: Point, size: Point, radius: number) {
    path.push(`M ${radius + position.x} ${position.y}`)
    // top
    this.drawEdge(
      path,
      { x: radius + position.x, y: position.y },
      { x: size.x - radius + position.x, y: position.y }
    )
    this.drawCorner(path, { x: size.x + position.x, y: radius + position.y }, radius)
    // right
    this.drawEdge(
      path,
      { x: size.x + position.x, y: radius + position.y },
      { x: size.x + position.x, y: size.y - radius + position.y }
    )
    this.drawCorner(path, { x: size.x - radius + position.x, y: size.y + position.y }, radius)
    // bottom
    this.drawEdge(
      path,
      { x: size.x - radius + position.x, y: size.y + position.y },
      { x: radius + position.x, y: size.y + position.y }
    )
    this.drawCorner(path, { x: position.x, y: size.y - radius + position.y }, radius)
    // left
    this.drawEdge(
      path,
      { x: position.x, y: size.y - radius + position.y },
      { x: position.x, y: radius + position.y }
    )
    this.drawCorner(path, { x: radius + position.x, y: position.y }, radius)

    path.push("Z")
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
      x: to.x > from.x ? 1 : to.x == from.x ? 0 : -1,
      y: to.y > from.y ? 1 : to.y == from.y ? 0 : -1,
    }

    path.push(`L ${from.x} ${from.y}`)
    features.forEach(feature => {
      if ("pointing" in feature) this.drawNook(path, feature as Nook, transform)
      else this.drawInset(path, feature as Inset, transform)
    }, this)
    path.push(`L ${to.x} ${to.y}`)
  }

  /**
   * Add a nook to the path, inward or outward, vertical or horizontal
   * @param path svg path elements to append nook to
   * @param nook nook to draw
   * @param transform transform matrix of the edge (1,1 for →↓, -1,-1 for ←↑, etc)
   */
  private drawNook(path: string[], nook: Nook, transform: Point) {
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
      `L ${nook.position.x - base.x / 2 - baseRadius.x} ${nook.position.y - base.y / 2 - baseRadius.y}`
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

  private drawInset(path: string[], inset: Inset, transform: Point) {
    const openRadius = inset.openRadius ?? 0
    const innerRadius = inset.innerRadius ?? 0

    // Start point
    path.push(`L ${inset.position.x} ${inset.position.y - transform.y * openRadius}`)

    // First corner
    // this.drawCorner(
    //   path,
    //   { x: inset.position.x - transform.x * openRadius, y: inset.position.y },
    //   openRadius
    // );

    // First edge
    const position1 = {
      x:
        transform.x == transform.y
          ? inset.position.x + transform.x * -inset.depth
          : inset.position.x,
      y:
        transform.x == transform.y
          ? inset.position.y
          : inset.position.y + transform.y * inset.width,
    }
    this.drawEdge(
      path,
      { x: inset.position.x - transform.x * openRadius, y: inset.position.y },
      { x: position1.x + transform.x * innerRadius, y: inset.position.y }
    )

    // Second corner
    // this.drawCorner(
    //   path,
    //   { x: position1.x, y: position1.y + transform.y * innerRadius },
    //   innerRadius,
    //   { sweep: false }
    // );

    // Second edge
    const position2 = {
      x: transform.x == transform.y ? position1.x : position1.x + transform.x * -inset.depth,
      y: transform.x == transform.y ? position1.y + transform.y * inset.width : position1.y,
    }
    this.drawEdge(
      path,
      { x: position1.x, y: position1.y + transform.y * innerRadius },
      { x: position2.x, y: position2.y - transform.y * innerRadius }
    )

    // Third corner
    // this.drawCorner(
    //   path,
    //   { x: position2.x + transform.x * innerRadius, y: position2.y },
    //   innerRadius,
    //   { sweep: false }
    // );

    // Third edge
    const position3 = {
      x: transform.x == transform.y ? position2.x + transform.x * inset.depth : position2.x,
      y: transform.x == transform.y ? position2.y : position2.y + transform.y * inset.width,
    }
    this.drawEdge(
      path,
      { x: position2.x + transform.x * innerRadius, y: position2.y },
      { x: position3.x - transform.x * openRadius, y: position3.y }
    )

    // Final corner
    // this.drawCorner(
    //   path,
    //   { x: position3.x, y: position3.y + transform.y * openRadius },
    //   openRadius
    // );
  }

  private consumeOnLine(from: Point, to: Point): (Nook | Inset)[] {
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
