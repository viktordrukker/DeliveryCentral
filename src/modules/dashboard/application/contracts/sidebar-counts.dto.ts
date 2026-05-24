/**
 * FE-#309 — single payload for the canvas sidebar count badges.
 *
 * 4 counts in 1 request; cuts the FE from N round-trips to 1 on every
 * SidebarNavV2 mount + per-poll refresh. Tenancy + per-role scoping
 * applied server-side so the FE never needs to know who can see what.
 */
export interface SidebarCountsDto {
  /** Projects the caller can see / has membership in. */
  projects: number;
  /** Pending items in the unified /approvals queue (issue 264). */
  approvals: number;
  /** People currently on bench in caller's RBAC scope. */
  bench: number;
  /** Open HR action cards (issue 263) + open cases scoped to caller. */
  hrQueue: number;
}
