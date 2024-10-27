export function findKeyByValue<K, V>(map: Map<K, V>, value: V): K | undefined {
  for (const [key, val] of map.entries()) {
      if (val === value) {
          return key;
      }
  }
  return undefined;
}