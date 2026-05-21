// PERF-04: bounded LRU. Map iteration order is insertion order, so on overflow we drop
// the oldest key. `getCached` re-inserts on hit to mark recency, giving LRU semantics.
const MAX_ENTRIES = Number(process.env.SIMPLE_CACHE_MAX_ENTRIES ?? 1000);

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * F-59 / 20c-11 — Invalidate a cache entry by key. Callers used to write
 * `setCache(key, null as unknown as <DTO>, 0)` which required a cast per
 * call site (one for each DTO type). The new helper makes the intent
 * obvious and removes the type-coercion need entirely.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}
