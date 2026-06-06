import { httpGet } from './http-client';
import { fetchDashboardEndpoint } from './dashboard-fetch';

/** Issue 265 — Director "What needs you now" anomaly cards. */
export type DirectorAnomalyKind =
  | 'project_rag_dropped'
  | 'utilization_spike'
  | 'pending_approval_age'
  | 'budget_overrun'
  | 'milestone_slip';

export type DirectorAnomalySeverity = 'info' | 'warning' | 'danger' | 'critical';

export interface DirectorAnomalyDto {
  kind: DirectorAnomalyKind;
  severity: DirectorAnomalySeverity;
  title: string;
  detail: string;
  href: string;
  decayRate: number;
  detectedAt: string;
  /**
   * LEAN-P4-missing-6 — ProjectPosition ids touched by this anomaly.
   * Populated for `project_rag_dropped`, `budget_overrun`, `milestone_slip`;
   * empty otherwise. Drives the `/staffing-desk?view=table&positionIds=...`
   * deep-link the BE already encodes in `href`.
   */
  targetPositions: string[];
}

export async function fetchDirectorAnomalies(limit = 5): Promise<DirectorAnomalyDto[]> {
  return httpGet<DirectorAnomalyDto[]>(`/dashboards/director/anomalies?limit=${limit}`);
}

export interface DirectorDashboardSummary {
  activeProjectCount: number;
  activeAssignmentCount: number;
  staffedPersonCount: number;
  unstaffedActivePersonCount: number;
  staffingUtilisationRate: number;
}

export interface UnitUtilisationItem {
  orgUnitId: string;
  orgUnitName: string;
  memberCount: number;
  staffedCount: number;
  utilisation: number;
}

export interface WeeklyTrendPoint {
  weekStarting: string;
  activeProjectCount: number;
  staffedPersonCount: number;
  staffingUtilisationRate: number;
}

export interface DirectorDashboardResponse {
  asOf: string;
  dataSources: string[];
  summary: DirectorDashboardSummary;
  unitUtilisation: UnitUtilisationItem[];
  weeklyTrend: WeeklyTrendPoint[];
}

export async function fetchDirectorDashboard(
  asOf?: string,
): Promise<DirectorDashboardResponse> {
  return fetchDashboardEndpoint<DirectorDashboardResponse>('/dashboard/director', { asOf });
}

/** LEAN-P4-missing-5 — per-OrgUnit Org Health metrics. */
export interface OrgHealthUnit {
  orgUnitId: string;
  orgUnitCode: string;
  orgUnitName: string;
  headcount: number;
  staffedCount: number;
  benchSize: number;
  unfillRatePct: number;
}

export interface OrgHealthResponse {
  asOf: string;
  totalHeadcount: number;
  totalBenchSize: number;
  portfolioUnfillRatePct: number;
  units: OrgHealthUnit[];
}

export async function fetchDirectorOrgHealth(asOf?: string): Promise<OrgHealthResponse> {
  const qs = asOf ? `?asOf=${encodeURIComponent(asOf)}` : '';
  return httpGet<OrgHealthResponse>(`/dashboards/director/org-health${qs}`);
}
