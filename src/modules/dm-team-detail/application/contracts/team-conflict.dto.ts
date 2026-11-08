/**
 * LEAN-P4-missing-8 — team-level conflict shape.
 *
 * A row exists for every (personId, weekStartIso) bucket where the sum
 * of `allocationPercent` across the DM's portfolio positions exceeds
 * 100% inside that week. Used by the DM dashboard "Team conflicts"
 * surface so a delivery manager can see who is over-booked across all
 * projects they own and drill into the offending positions.
 */
export interface TeamConflictPosition {
  positionId: string;
  // W1-11 — opaque ProjectPosition publicId (`pos_…`) for deep-linking from
  // the Director anomalies surface. Null until the foundation backfill
  // covers legacy rows.
  positionPublicId: string | null;
  projectId: string;
  projectCode: string;
  allocationPct: number;
}

export interface TeamConflict {
  personId: string;
  personName: string;
  weekStartIso: string;
  totalAllocationPct: number;
  conflictPositions: TeamConflictPosition[];
}

export interface TeamConflictsResponse {
  asOf: string;
  conflicts: TeamConflict[];
}
