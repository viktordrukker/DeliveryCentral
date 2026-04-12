import { httpGet } from './http-client';

export interface UtilizationPersonRow {
  actualHours: number;
  assignedHours: number;
  availableHours: number;
  personId: string;
  personName: string;
  utilizationPercent: number;
}

export interface UtilizationReport {
  byPerson: UtilizationPersonRow[];
  fromDate: string;
  stdHoursPerDay: number;
  toDate: string;
}

export async function fetchUtilizationReport(params: {
  from: string;
  orgUnitId?: string;
  personId?: string;
  to: string;
}): Promise<UtilizationReport> {
  const p = new URLSearchParams({ from: params.from, to: params.to });
  if (params.orgUnitId) p.set('orgUnitId', params.orgUnitId);
  if (params.personId) p.set('personId', params.personId);
  return httpGet<UtilizationReport>(`/reports/utilization?${p.toString()}`);
}
