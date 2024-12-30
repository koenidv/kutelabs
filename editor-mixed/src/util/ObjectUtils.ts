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
