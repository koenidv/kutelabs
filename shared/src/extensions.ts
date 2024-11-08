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
}

Object.prototype.also = function <T>(this: T, block: (it: T) => void): T {
  block(this)
  return this
}

Object.prototype.let = function <T, R>(
  this: T | null | undefined,
  block: (it: T) => R
): R | null | undefined {
  if (this === null) return null
  if (this === undefined) return undefined
  return block(this)
}

Array.prototype.firstOrNull = function <T>(this: T[]): T | null {
  return this.length > 0 ? this[0] : null
}
