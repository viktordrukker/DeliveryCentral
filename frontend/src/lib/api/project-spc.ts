import { httpGet } from './http-client';

export type SpcDataSource = 'live' | 'demo' | 'override';

export interface SpcWeekPoint {
  weekStarting: string;
  hours: number;
  cost: number;
}

export interface SpcBurndownDto {
  projectId: string;
  points: SpcWeekPoint[];
  totalHours: number;
  totalSpcCost: number;
  vendorAccrualToDate: number;
  bac: number | null;
  appliedHourlyRate: number | null;
  rateSource: 'role-plan' | 'org-default' | null;
  dataSource: SpcDataSource;
}

export async function fetchSpcBurndown(projectId: string, weeks = 12): Promise<SpcBurndownDto> {
  return httpGet<SpcBurndownDto>(`/projects/${projectId}/spc-burndown?weeks=${weeks}`);
}
