import { httpGet } from './http-client';

export interface ProjectTimeToFillPosition {
  positionId: string;
  role: string;
  fillStatus: string;
  firstOpenedAt: string | null;
  firstBookedAt: string | null;
  timeToFillDays: number | null;
}

export interface ProjectTimeToFill {
  projectId: string;
  positionCount: number;
  filledCount: number;
  medianDays: number | null;
  positions: ProjectTimeToFillPosition[];
}

/**
 * LEAN-P4b-1 — fetches the time-to-fill metric for a project. Each position
 * exposes `timeToFillDays` (days from OPENED → BOOKED) and the aggregate
 * `medianDays` is computed across all filled positions.
 */
export async function fetchProjectTimeToFill(projectId: string): Promise<ProjectTimeToFill> {
  return httpGet<ProjectTimeToFill>(`/projects/${projectId}/metrics/time-to-fill`);
}
