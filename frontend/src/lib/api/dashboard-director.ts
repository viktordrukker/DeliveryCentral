import { fetchDashboardEndpoint } from './dashboard-fetch';

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
