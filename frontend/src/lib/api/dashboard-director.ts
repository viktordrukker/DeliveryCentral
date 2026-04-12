import { httpGet } from './http-client';

export interface DirectorDashboardSummary {
  activeProjectCount: number;
  activeAssignmentCount: number;
  staffedPersonCount: number;
  unstaffedActivePersonCount: number;
  evidenceCoverageRate: number;
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
  evidenceCoverageRate: number;
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
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const suffix = params.toString();

  return httpGet<DirectorDashboardResponse>(
    `/dashboard/director${suffix ? `?${suffix}` : ''}`,
  );
}
