import { httpGet } from './http-client';

/**
 * LEAN-P4-missing-8 — team-level conflict surface for the DM dashboard.
 *
 * One row per (person, weekStart) bucket inside a 4-week rolling window
 * where the sum of `allocationPct` across the DM's portfolio breaches
 * 100 %. `conflictPositions` lists every contributing ProjectPosition so
 * the table can drill down to the offending rows.
 */
export interface TeamConflictPosition {
  positionId: string;
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

export async function fetchTeamConflicts(asOf?: string): Promise<TeamConflictsResponse> {
  const params = new URLSearchParams();
  if (asOf) params.set('asOf', asOf);
  const suffix = params.toString();
  return httpGet<TeamConflictsResponse>(`/dm-team/conflicts${suffix ? `?${suffix}` : ''}`);
}
