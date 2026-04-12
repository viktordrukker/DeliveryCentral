import { httpDelete, httpGet, httpPost } from './http-client';

export interface CapitalisationProjectRow {
  projectId: string;
  projectName: string;
  capexHours: number;
  opexHours: number;
  totalHours: number;
  capexPercent: number;
  alert?: boolean;
  deviation?: number;
}

export interface CapitalisationTotals {
  capexHours: number;
  opexHours: number;
  totalHours: number;
  capexPercent: number;
}

export interface PeriodTrendPoint {
  month: string;
  capexPercent: number;
}

export interface CapitalisationReport {
  period: { from: string; to: string };
  byProject: CapitalisationProjectRow[];
  totals: CapitalisationTotals;
  periodTrend: PeriodTrendPoint[];
}

export interface PeriodLock {
  id: string;
  periodFrom: string;
  periodTo: string;
  lockedBy: string;
  lockedAt: string;
}

export async function fetchCapitalisationReport(params: {
  from: string;
  to: string;
  projectId?: string;
}): Promise<CapitalisationReport> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });

  if (params.projectId) {
    qs.set('projectId', params.projectId);
  }

  return httpGet<CapitalisationReport>(`/reports/capitalisation?${qs.toString()}`);
}

export async function fetchPeriodLocks(): Promise<PeriodLock[]> {
  return httpGet<PeriodLock[]>('/admin/period-locks');
}

export async function createPeriodLock(from: string, to: string): Promise<PeriodLock> {
  return httpPost<PeriodLock, { from: string; to: string }>('/admin/period-locks', { from, to });
}

export async function deletePeriodLock(id: string): Promise<void> {
  return httpDelete<void>(`/admin/period-locks/${id}`);
}
