/**
 * FE-#312 — legacy → canonical URL map for audit-log path searches.
 *
 * Phase E redirects ~6 legacy URLs to canvas-canonical equivalents when
 * `dsRefresh` is on. To keep BusinessAudit searches coherent across the
 * cutover (admin filters by `path=/dashboard/employee` should also find
 * `/me` entries written after the flip), this map is the source of truth
 * for the equivalence pairs.
 *
 * Lookup is bidirectional — either side of a pair matches the other in
 * audit search queries. Caller logic lives in BusinessAuditQueryService
 * (FE-#312 follow-up — not wired in this PR; export-only so other code
 * can start reusing the map).
 *
 * Plan: `/home/drukker/.claude/plans/v2-lean-restructure-phase-e.md` §6 → NEW-E4
 */
export const LEGACY_PATH_MAP: Readonly<Record<string, string>> = {
  // Workload Overview at / → role-based home (/me for non-director,
  // /dashboard/director for director). The role-dependent destination is
  // resolved by the redirect handler; this map captures only the unambiguous
  // legacy → canvas-canonical pairs.
  '/dashboard/employee': '/me',
  '/dashboard/manager': '/me',
  '/dashboard/exec': '/dashboard/director',
  '/assignments/queue': '/approvals',
  // Project dashboard tab moves to Pulse — :id stays templated so the
  // map is a pattern, not an exact-string match. Audit search should
  // resolve the :id segment before lookup.
  '/projects/:id/dashboard': '/projects/:id?tab=pulse',
};

/**
 * Returns the canonical path for a known legacy path, or `null` if the
 * input isn't a legacy path. For pattern entries (e.g. `/projects/:id/dashboard`)
 * the caller is responsible for substituting the `:id` segment before
 * calling this; the lookup is exact-string on the resolved path.
 */
export function canonicalisePath(input: string): string | null {
  return LEGACY_PATH_MAP[input] ?? null;
}

/**
 * Returns true if `input` matches `target` either directly or through
 * the legacy ↔ canonical equivalence map. Used by audit search to find
 * entries on either side of the redirect.
 */
export function pathsAreEquivalent(input: string, target: string): boolean {
  if (input === target) return true;
  if (LEGACY_PATH_MAP[input] === target) return true;
  if (LEGACY_PATH_MAP[target] === input) return true;
  return false;
}
