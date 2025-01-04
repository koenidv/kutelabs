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
}

export interface Inset {
  position: Point
  width: number
  depth: number
}

export interface RectangleConfig {
  width: number
  height: number
  cornerRadius: number
  nooks: Nook[]
  insets: Inset[]
}

export class RectBuilder {
  private config: RectangleConfig

  constructor(config: RectangleConfig) {
    this.config = config
  }

  generatePath(): string {
    const path: string[] = []
    const { width, height, cornerRadius, nooks, insets } = this.config

    path.push(`M ${cornerRadius} 0`)

    const getFeatures = (startX: number, startY: number, endX: number, endY: number) => {
      return [...nooks, ...insets]
        .filter(feature => {
          const pos = "position" in feature ? feature.position : feature
          return this.isPointOnLine({ x: startX, y: startY }, { x: endX, y: endY }, pos)
        })
        .sort((a, b) => {
          // sort along line
          return (
            this.getDistance({ x: startX, y: startY }, a.position) -
            this.getDistance({ x: startX, y: startY }, b.position)
          )
        })
    }

    // top
    this.addEdgeToPath(
      path,
      { x: cornerRadius, y: 0 },
      { x: width - cornerRadius, y: 0 },
      { x: 1, y: 1 },
      getFeatures(cornerRadius, 0, width - cornerRadius, 0)
    )
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 ${width} ${cornerRadius}`)

    // right
    this.addEdgeToPath(
      path,
      { x: width, y: cornerRadius },
      { x: width, y: height - cornerRadius },
      { x: 1, y: -1 },
      getFeatures(width, cornerRadius, width, height - cornerRadius)
    )
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 ${width - cornerRadius} ${height}`)

    // bottom
    this.addEdgeToPath(
      path,
      { x: width - cornerRadius, y: height },
      { x: cornerRadius, y: height },
      { x: -1, y: -1 },
      getFeatures(width - cornerRadius, height, cornerRadius, height)
    )
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 0 ${height - cornerRadius}`)

    // left
    this.addEdgeToPath(
      path,
      { x: 0, y: height - cornerRadius },
      { x: 0, y: cornerRadius },
      { x: -1, y: 1 },
      getFeatures(0, height - cornerRadius, 0, cornerRadius)
    )
    path.push(`A ${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} 0`)

    path.push("Z")
    return path.join(" ")
  }

  private addEdgeToPath(
    path: string[],
    start: Point,
    end: Point,
    transform: Point,
    features: (Nook | Inset)[]
  ): void {
    path.push(`L ${start.x} ${start.y}`)

    features.forEach(feature => {
      if ("mode" in feature) this.addNook(path, feature as Nook, transform)
      else this.addInset(path, feature as Inset, transform)
    })

    path.push(`L ${end.x} ${end.y}`)
  }

  private addNook(path: string[], nook: Nook, transform: Point) {
    const modeFactor = nook.mode === "outward" ? -1 : 1
    if (nook.pointing === "vertical") {
      path.push(`L ${nook.position.x - (transform.y * nook.width) / 2} ${nook.position.y}`)
      path.push(`l ${(transform.y * nook.width) / 2} ${transform.x * modeFactor * nook.length}`)
      path.push(`l ${(transform.y * nook.width) / 2} ${transform.x * modeFactor * -nook.length}`)
    } else {
      path.push(`L ${nook.position.x} ${nook.position.y - (transform.x * nook.length) / 2}`)
      path.push(`l ${transform.y * modeFactor * nook.length} ${(transform.x * nook.width) / 2}`)
      path.push(`l ${transform.y * modeFactor * -nook.length} ${(transform.x * nook.width) / 2}`)
    }
  }

  private addInset(path: string[], inset: Inset, transform: Point) {
    if (transform.x != 1 && transform.y != 1) {
      console.error("Insets currently only support (+,-) transforms")
      return
    }
    path.push(`L ${inset.position.x} ${inset.position.y}`)
    path.push(`l ${transform.x * -inset.depth} 0`)
    path.push(`l 0 ${transform.y * -inset.width}`)
    path.push(`l ${transform.x * inset.depth} 0`)
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
