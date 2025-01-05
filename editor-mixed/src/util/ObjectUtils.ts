export function objectsEqual1d<T extends Record<string, any> | null>(a: T, b: T): boolean {
  if (a == null && b == null) return true
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every(key => keysB.includes(key) && a[key] === b[key])
}

export function clone1d<T extends Record<string, any> | null>(obj: T): T {
  if (obj == null) return obj
  return Object.fromEntries(Object.entries(obj)) as T
}

/**
 * Deep clone an object, because structuredClone will throws on ProxyObjects and WeakRefs
 * @param source object to clone
 * @returns cloned object
 */
export function deepClone<T>(source: T): T {
  if (source instanceof Map) {
    return new Map(
      Array.from(source.entries()).map(([key, value]) => [key, deepClone(value)])
    ) as any
  }
  if (source instanceof Date) {
    return new Date(source.getTime()) as any
  }
  if (Array.isArray(source)) {
    return source.map(item => deepClone(item)) as any
  }
  if (source && typeof source === "object") {
    return Object.getOwnPropertyNames(source).reduce(
      (o, prop) => {
        Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop)!)
        o[prop] = deepClone((source as { [key: string]: any })[prop])
        return o
      },
      Object.create(Object.getPrototypeOf(source))
    ) as T
  }
  return source
}
