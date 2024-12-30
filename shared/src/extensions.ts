// create non-enumerable properties to not break prism
declare global {
  interface Object {
    also<T>(this: T, block: (it: T) => void): T
    let<T, R>(
      this: T | null | undefined,
      block: (it: T) => R
    ): R | null | undefined
  }
  interface Array<T> {
    firstOrNull<T>(this: T[]): T | null
  }
  interface Number {
    coerceIn(this: number, min: number, max: number): number
  }
}

Object.defineProperty(Object.prototype, "also", {
  value: function <T>(this: T, block: (it: T) => void): T {
    block(this)
    return this
  },
  enumerable: false,
  writable: true,
  configurable: true,
})

Object.defineProperty(Object.prototype, "let", {
  value: function <T, R>(
    this: T | null | undefined,
    block: (it: T) => R
  ): R | null | undefined {
    if (this === null) return null
    if (this === undefined) return undefined
    return block(this)
  },
  enumerable: false,
  writable: true,
  configurable: true,
})

Object.defineProperty(Array.prototype, "firstOrNull", {
  value: function <T>(this: T[]): T | null {
    return this.length > 0 ? this[0] : null
  },
  enumerable: false,
  writable: true,
  configurable: true,
})

Object.defineProperty(Number.prototype, "coerceIn", {
  value: function (this: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, this))
  },
  enumerable: false,
  writable: true,
  configurable: true,
})
