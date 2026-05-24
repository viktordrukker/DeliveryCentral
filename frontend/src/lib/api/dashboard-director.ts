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
