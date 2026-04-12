const cache = new Map<string, string>();

export function resolvePersonName(
  id: string,
  people: Array<{ id: string; displayName: string }>,
): string {
  if (cache.has(id)) return cache.get(id)!;
  const found = people.find((p) => p.id === id);
  if (found) {
    cache.set(id, found.displayName);
    return found.displayName;
  }
  return id;
}
