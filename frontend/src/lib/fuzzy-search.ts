/**
 * Simple fuzzy search: split query into words, check if ALL words appear
 * as substrings in the target (case-insensitive, order-independent).
 * "ali gar" matches "Alice Garcia", "gar ali" matches too.
 */
export function fuzzyMatch(target: string, query: string): boolean {
  if (!query) return true;
  const t = target.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => t.includes(w));
}
