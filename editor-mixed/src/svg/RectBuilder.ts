export interface Point {
  x: number
  y: number
}

export interface Nook {
  position: Point
  width: number
  length: number
  mode: "inward" | "outward"
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
type TurtleState = { position: Point; direction: Point }
type NookMetrics = { baseRadius: number; pointRadius: number; halfWidth: number }
type InsetMetrics = { openRadius: number; innerRadius: number }

export class RectBuilder {
  private container: Rectangle
  private features: (Nook | Inset)[] = []
  private cutouts: Cutout[] = []
  private turtlePosition: Point = { x: 0, y: 0 }
  private turtleDirection: Point = { x: 1, y: 0 }

  /**
   * Construct a RectBuilder for a container rectangle.
   */
  constructor(config: Rectangle) {
    this.container = config
  }

  /**
   * Add a feature placed along the top edge at the given x offset.
   */
  public addToTop(feature: AddFeatureType, x: number): this {
    this.features.push({
      ...feature,
      position: { x: x + (this.container.offset?.x ?? 0), y: this.container.offset?.y ?? 0 },
    })
    return this
  }
  /**
   * Add a feature placed along the right edge at the given y offset.
   */
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
  /**
   * Add a feature placed along the bottom edge at the given x offset.
   */
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
  /**
   * Add a feature placed along the left edge at the given y offset.
   */
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

  /**
   * Generate the SVG path string for the rectangle and its features.
   */
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

  /**
   * Draw a rounded rectangle using the turtle, starting clockwise from top-left.
   */
  private drawRect(path: string[], position: Point, size: Point, radius: number) {
    const cornerRadius = Math.max(0, radius)
    this.resetTurtle({ x: position.x + cornerRadius, y: position.y }, { x: 1, y: 0 })

    path.push(`M ${this.turtlePosition.x} ${this.turtlePosition.y}`)
    this.traceEdge(path, size.x - 2 * cornerRadius)
    this.drawCornerTurn(path, cornerRadius, 90)

    this.traceEdge(path, size.y - 2 * cornerRadius)
    this.drawCornerTurn(path, cornerRadius, 90)

    this.traceEdge(path, size.x - 2 * cornerRadius)
    this.drawCornerTurn(path, cornerRadius, 90)

    this.traceEdge(path, size.y - 2 * cornerRadius)
    this.drawCornerTurn(path, cornerRadius, 90)

    path.push("Z")
  }

  /**
   * Emit an arc/line for a corner; uses absolute coordinates unless relative flag set.
   */
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

  /**
   * Emit a quadratic bezier segment.
   */
  private drawQuadratic(
    path: string[],
    to: Point,
    control: Point,
    overrideProps: { relative?: boolean } = {}
  ) {
    const props = { relative: false, ...overrideProps }
    path.push(`${props.relative ? "q" : "Q"} ${control.x} ${control.y} ${to.x} ${to.y}`)
  }

  /**
   * Trace an edge of given length with the turtle and insert features encountered along it.
   */
  private drawEdge(path: string[], state: TurtleState, length: number) {
    const edgeDirection = { ...state.direction }
    const edgeStart = { ...state.position }
    const edgeEnd = this.translate(edgeStart, edgeDirection, length)
    const features = this.consumeOnLine(edgeStart, edgeEnd)
    let consumed = 0

    const advance = (distance: number) => {
      if (distance <= 0) return
      const to = this.translate(state.position, edgeDirection, distance)
      this.moveLine(path, state, to)
      state.direction = { ...edgeDirection }
      consumed += distance
    }

    if (path[path.length - 1]?.startsWith("L ") === false)
      path.push(`L ${state.position.x} ${state.position.y}`)

    features.forEach(feature => {
      if (this.isNook(feature)) {
        const metrics = this.resolveNookMetrics(feature)
        const startDistance =
          this.projectDistance(edgeStart, feature.position, edgeDirection) -
          feature.width / 2 -
          metrics.baseRadius
        advance(startDistance - consumed)
        consumed += this.drawNook(path, state, feature, edgeDirection, metrics)
      } else {
        const metrics = this.resolveInsetMetrics(feature)
        const startDistance =
          this.projectDistance(edgeStart, feature.position, edgeDirection) - metrics.openRadius
        advance(startDistance - consumed)
        consumed += this.drawInset(path, state, feature, edgeDirection, metrics)
      }
    })

    advance(length - consumed)
  }

  private isNook(feature: Nook | Inset): feature is Nook {
    return "length" in feature
  }

  /**
   * Draw a nook (protrusion or indentation) using turtle-relative math and return
   * the length consumed along the edge.
   */
  private drawNook(
    path: string[],
    state: TurtleState,
    nook: Nook,
    edgeDirection: Point,
    metrics: NookMetrics
  ): number {
    const forward = this.normalizeDirection(edgeDirection)
    const inward = this.rotate90CCW(forward)
    const normal = nook.mode === "inward" ? inward : { x: -inward.x, y: -inward.y }

    const baseRadius = metrics.baseRadius
    const pointRadius = metrics.pointRadius
    const halfWidth = metrics.halfWidth

    const baseLeft = this.translate(state.position, forward, baseRadius)
    const baseCenter = this.translate(baseLeft, forward, halfWidth)
    const baseRight = this.translate(baseLeft, forward, nook.width)
    const exitPoint = this.translate(baseRight, forward, baseRadius)
    const apex = this.translate(baseCenter, normal, nook.length)

    const diagLeft = this.normalizeDirection({ x: apex.x - baseLeft.x, y: apex.y - baseLeft.y })
    const diagRight = this.normalizeDirection({ x: apex.x - baseRight.x, y: apex.y - baseRight.y })
    const diagLeftLength = this.getDistance(baseLeft, apex)
    const diagRightLength = this.getDistance(baseRight, apex)

    const effectiveBaseRadius = Math.min(baseRadius, diagLeftLength, diagRightLength)
    const effectivePointRadius = Math.min(
      pointRadius,
      Math.max(0, diagLeftLength - effectiveBaseRadius),
      Math.max(0, diagRightLength - effectiveBaseRadius)
    )

    const startAfterBase =
      effectiveBaseRadius > 0 ? this.translate(baseLeft, diagLeft, effectiveBaseRadius) : baseLeft

    if (effectiveBaseRadius > 0) {
      this.drawQuadraticTo(path, state, startAfterBase, baseLeft)
    } else {
      this.moveLine(path, state, baseLeft)
    }

    const segmentToTip = Math.max(0, diagLeftLength - effectiveBaseRadius - effectivePointRadius)
    if (segmentToTip > 0) {
      const tipEntry = this.translate(startAfterBase, diagLeft, segmentToTip)
      this.moveLine(path, state, tipEntry)
    }

    if (effectivePointRadius > 0) {
      const tipExit = this.translate(apex, diagRight, -effectivePointRadius)
      this.drawQuadraticTo(path, state, tipExit, apex)
    } else {
      this.moveLine(path, state, apex)
    }

    const preBaseRight =
      effectiveBaseRadius > 0
        ? this.translate(baseRight, diagRight, effectiveBaseRadius)
        : baseRight

    if (!this.arePointsClose(state.position, preBaseRight)) this.moveLine(path, state, preBaseRight)

    if (effectiveBaseRadius > 0) {
      this.drawQuadraticTo(path, state, exitPoint, baseRight, forward)
    } else {
      this.moveLine(path, state, exitPoint)
    }

    state.position = exitPoint
    state.direction = { ...forward }

    return nook.width + effectiveBaseRadius * 2
  }

  /**
   * Draw an inset (a recessed rectangular pocket) using turtle-relative math and return
   * the length consumed along the edge.
   */
  private drawInset(
    path: string[],
    state: TurtleState,
    inset: Inset,
    edgeDirection: Point,
    metrics: InsetMetrics
  ): number {
    const forward = this.normalizeDirection(edgeDirection)
    const inward = this.rotate90CCW(forward)
    const outward = { x: -inward.x, y: -inward.y }
    const openRadius = metrics.openRadius
    const innerRadius = metrics.innerRadius

    const entry = inset.position
    const exit = this.translate(entry, forward, inset.width)
    const entryCorner = openRadius > 0 ? this.translate(entry, inward, openRadius) : entry
    const innerWallStart = this.translate(entry, inward, inset.depth - innerRadius)
    const innerTopCorner =
      innerRadius > 0
        ? this.translate(this.translate(innerWallStart, forward, innerRadius), inward, innerRadius)
        : innerWallStart
    const innerBottomStart =
      innerRadius > 0
        ? this.translate(innerTopCorner, forward, Math.max(0, inset.width - 2 * innerRadius))
        : this.translate(innerTopCorner, forward, inset.width)
    const innerBottomCorner =
      innerRadius > 0
        ? this.translate(exit, inward, inset.depth - innerRadius)
        : this.translate(exit, inward, inset.depth)
    const exitCorner = openRadius > 0 ? this.translate(exit, inward, openRadius) : exit
    const exitAfter = openRadius > 0 ? this.translate(exit, forward, openRadius) : exit

    // Entry corner / entry point
    if (openRadius > 0) this.applyCorner(path, state, entryCorner, openRadius, inward)
    else this.moveLine(path, state, entry)

    // Trace inner walls using helper (consumes features on those walls)
    if (!this.arePointsClose(state.position, innerWallStart)) {
      state.direction = this.normalizeDirection(inward)
      this.traceStraightSegment(path, state, innerWallStart)
    } else {
      state.direction = { ...inward }
    }

    // At the top inner corner - draw inner corner arc or line
    if (innerRadius > 0) {
      this.applyCorner(path, state, innerTopCorner, innerRadius, forward, { sweep: false })
    } else {
      this.moveLine(path, state, innerTopCorner)
    }

    // Trace the inner bottom segment (across the inset width) using traceEdge so edge features are consumed
    if (!this.arePointsClose(state.position, innerBottomStart)) {
      state.direction = this.normalizeDirection(forward)
      this.traceStraightSegment(path, state, innerBottomStart)
    } else {
      state.direction = { ...forward }
    }

    // Inner bottom corner
    if (innerRadius > 0) {
      this.applyCorner(path, state, innerBottomCorner, innerRadius, outward, { sweep: false })
    } else {
      this.moveLine(path, state, innerBottomCorner)
    }

    // Trace the inner exit wall back to the exit corner so features on that wall are processed
    if (!this.arePointsClose(state.position, exitCorner)) {
      state.direction = this.normalizeDirection(outward)
      this.traceStraightSegment(path, state, exitCorner)
    } else {
      state.direction = { ...outward }
    }

    // Exit corner and after-exit (open radius)
    if (openRadius > 0) this.applyCorner(path, state, exitAfter, openRadius, forward)
    else this.moveLine(path, state, exitAfter)

    state.direction = { ...forward }

    return inset.width + openRadius * 2
  }

  /**
   * Move to `toPoint` (start at state's current position), align the builder turtle,
   * trace the straight segment using traceEdge, and update the provided state from the builder turtle.
   */
  private traceStraightSegment(path: string[], state: TurtleState, toPoint: Point) {
    const start = { ...state.position }

    const projected = this.projectDistance(start, toPoint, state.direction)
    const length = Math.max(0, projected)

    if (this.arePointsClose(start, toPoint) || length <= 0) return

    this.moveLine(path, state, start)
    this.resetTurtle(state.position, state.direction)
    this.traceEdge(path, length)

    state.position = { ...this.turtlePosition }
    state.direction = { ...this.turtleDirection }
  }

  private moveLine(path: string[], state: TurtleState, to: Point) {
    if (this.arePointsClose(state.position, to)) return
    path.push(`L ${to.x} ${to.y}`)
    const direction = this.normalizeDirection({
      x: to.x - state.position.x,
      y: to.y - state.position.y,
    })
    state.position = { ...to }
    if (direction.x !== 0 || direction.y !== 0) state.direction = direction
  }

  /**
   * Move the turtle to the given point while emitting a line segment.
   */

  private drawQuadraticTo(
    path: string[],
    state: TurtleState,
    to: Point,
    control: Point,
    finalDirection?: Point
  ) {
    if (this.arePointsClose(state.position, to)) return
    this.drawQuadratic(path, to, control)
    state.position = { ...to }
    if (finalDirection) state.direction = this.normalizeDirection(finalDirection)
    else {
      const tangent = this.normalizeDirection({ x: to.x - control.x, y: to.y - control.y })
      if (tangent.x !== 0 || tangent.y !== 0) state.direction = tangent
    }
  }

  /**
   * Emit a quadratic bezier towards `to` with given control, updating turtle state.
   */

  private applyCorner(
    path: string[],
    state: TurtleState,
    endpoint: Point,
    radius: number,
    finalDirection: Point,
    overrideProps: { sweep?: boolean } = {}
  ) {
    if (radius <= 0 || this.arePointsClose(state.position, endpoint)) {
      this.moveLine(path, state, endpoint)
    } else {
      this.drawCorner(path, endpoint, radius, overrideProps)
      state.position = { ...endpoint }
    }
    state.direction = this.normalizeDirection(finalDirection)
  }

  /**
   * Draw a corner arc or move straight to the endpoint, and update turtle direction.
   */

  private translate(point: Point, direction: Point, distance: number): Point {
    return {
      x: point.x + direction.x * distance,
      y: point.y + direction.y * distance,
    }
  }

  /**
   * Translate a point along a direction by a distance.
   */

  private projectDistance(start: Point, target: Point, direction: Point): number {
    return (target.x - start.x) * direction.x + (target.y - start.y) * direction.y
  }

  /**
   * Project the vector from start to target onto the given direction (signed distance).
   */

  private rotate90CCW(direction: Point): Point {
    return { x: -direction.y, y: direction.x }
  }

  /**
   * Rotate a direction vector 90 degrees counter-clockwise.
   */

  private resolveNookMetrics(nook: Nook): NookMetrics {
    const halfWidth = nook.width / 2
    const diagonal = Math.hypot(halfWidth, nook.length)
    const baseRadius = this.clamp(nook.baseRadius ?? 0, 0, diagonal)
    const pointRadius = this.clamp(nook.pointRadius ?? 0, 0, Math.max(0, diagonal - baseRadius))
    return { baseRadius, pointRadius, halfWidth }
  }

  /**
   * Resolve and clamp metrics for a nook (radii and half width).
   */

  private resolveInsetMetrics(inset: Inset): InsetMetrics {
    const radiusLimit = Math.min(inset.width / 2, inset.depth)
    const openRadius = this.clamp(inset.openRadius ?? 0, 0, radiusLimit)
    const innerRadius = this.clamp(
      inset.innerRadius ?? 0,
      0,
      Math.min(inset.depth, inset.width / 2)
    )
    return { openRadius, innerRadius }
  }

  /**
   * Resolve and clamp metrics for an inset (open and inner radii).
   */

  private arePointsClose(a: Point, b: Point, epsilon = 1e-6): boolean {
    return this.getDistance(a, b) < epsilon
  }

  /**
   * Return whether two points are within a small epsilon distance.
   */

  private clamp(value: number, min: number, max: number): number {
    if (value < min) return min
    if (value > max) return max
    return value
  }

  /**
   * Clamp a numeric value between min and max.
   */

  private resetTurtle(position: Point, direction: Point) {
    this.turtlePosition = { ...position }
    this.turtleDirection = this.normalizeDirection(direction)
  }

  /**
   * Reset the turtle state to the provided position and direction.
   */

  private rotate(angle: number) {
    this.turtleDirection = this.rotateVector(this.turtleDirection, angle)
  }

  /**
   * Rotate the turtle's direction by `angle` degrees.
   */

  private rotateVector(direction: Point, angle: number): Point {
    const radians = (angle * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    return this.normalizeDirection({
      x: direction.x * cos - direction.y * sin,
      y: direction.x * sin + direction.y * cos,
    })
  }

  /**
   * Rotate an arbitrary vector by angle (degrees) and normalize the result.
   */

  private normalizeDirection(direction: Point): Point {
    const length = Math.hypot(direction.x, direction.y)
    if (length === 0) return { x: 0, y: 0 }

    const threshold = 1e-10
    let x = direction.x / length
    let y = direction.y / length

    if (Math.abs(x) < threshold) x = 0
    if (Math.abs(y) < threshold) y = 0
    if (Math.abs(Math.abs(x) - 1) < threshold) x = Math.sign(x)
    if (Math.abs(Math.abs(y) - 1) < threshold) y = Math.sign(y)

    return { x, y }
  }

  /**
   * Normalize a direction vector and snap near-axial values to exact -1/0/1.
   */

  private traceEdge(path: string[], length: number) {
    const distance = Math.max(0, length)
    const state: TurtleState = {
      position: { ...this.turtlePosition },
      direction: { ...this.turtleDirection },
    }
    this.drawEdge(path, state, distance)

    this.turtlePosition = state.position
    this.turtleDirection = state.direction
  }

  /**
   * Trace an edge of the rectangle by delegating to the turtle-based edge tracer.
   */

  private drawCornerTurn(path: string[], radius: number, angle: number) {
    const currentDirection = { ...this.turtleDirection }
    const safeRadius = Math.max(0, radius)
    this.rotate(angle)
    const destination =
      safeRadius === 0
        ? { ...this.turtlePosition }
        : {
            x:
              this.turtlePosition.x +
              currentDirection.x * safeRadius +
              this.turtleDirection.x * safeRadius,
            y:
              this.turtlePosition.y +
              currentDirection.y * safeRadius +
              this.turtleDirection.y * safeRadius,
          }

    this.drawCorner(path, destination, safeRadius, { sweep: angle > 0 })
    this.turtlePosition = destination
  }

  /**
   * Perform the rounded corner transition and rotate the turtle by `angle` degrees.
   */

  private consumeOnLine(from: Point, to: Point): (Nook | Inset)[] {
    const onLine = this.features.filter(feature => this.isPointOnLine(from, to, feature.position))
    this.features = this.features.filter(feature => !onLine.includes(feature))
    return onLine.sort((a, b) => {
      // all points share a line, sort along line
      return this.getDistance(from, a.position) - this.getDistance(from, b.position)
    })
  }

  /**
   * Consume and return any features that lie on the line between `from` and `to`.
   */

  private isPointOnLine(start: Point, end: Point, point: Point): boolean {
    const d1 = this.getDistance(start, point)
    const d2 = this.getDistance(point, end)
    const lineLength = this.getDistance(start, end)
    const buffer = 0.1 // float buffer

    return Math.abs(d1 + d2 - lineLength) < buffer
  }

  /**
   * Return whether a point lies (approximately) on the line segment between start and end.
   */

  private getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  /**
   * Euclidean distance between two points.
   */
}
