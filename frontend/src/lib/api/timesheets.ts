import { httpGet, httpPost, httpPut } from './http-client';

export interface TimesheetEntry {
  id: string;
  projectId: string;
  assignmentId?: string;
  date: string; // YYYY-MM-DD
  hours: number;
  capex: boolean;
  description?: string;
}

export interface TimesheetWeek {
  id: string;
  personId: string;
  weekStart: string; // YYYY-MM-DD
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  entries: TimesheetEntry[];
}

export interface UpsertEntryInput {
  weekStart: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  hours: number;
  capex?: boolean;
  description?: string;
}

export interface TimeReportData {
  byProject: Array<{ name: string; hours: number; standardHours: number; overtimeHours: number; benchHours: number }>;
  byPerson: Array<{ name: string; hours: number; standardHours: number; overtimeHours: number; benchHours: number }>;
  byDay: Array<{ date: string; hours: number }>;
  weeklyTrend: Array<{ week: string; standard: number; overtime: number; bench: number; leave: number }>;
  capexHours: number;
  opexHours: number;
  standardHours: number;
  overtimeHours: number;
  benchHours: number;
  leaveHours: number;
  totalHours: number;
}

export async function fetchMyTimesheetWeek(weekStart: string): Promise<TimesheetWeek> {
  const params = new URLSearchParams({ weekStart });
  return httpGet<TimesheetWeek>(`/timesheets/my?${params.toString()}`);
}

export async function upsertTimesheetEntry(entry: UpsertEntryInput): Promise<TimesheetEntry> {
  return httpPut<TimesheetEntry, UpsertEntryInput>('/timesheets/my/entries', entry);
}

export async function submitTimesheetWeek(weekStart: string): Promise<TimesheetWeek> {
  return httpPost<TimesheetWeek, Record<string, never>>(
    `/timesheets/my/${encodeURIComponent(weekStart)}/submit`,
    {},
  );
}

export async function fetchTimesheetHistory(params?: {
  from?: string;
  to?: string;
}): Promise<TimesheetWeek[]> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return httpGet<TimesheetWeek[]>(`/timesheets/my/history${query}`);
}

export async function fetchApprovalQueue(params?: {
  status?: string;
  personId?: string;
  from?: string;
  to?: string;
}): Promise<TimesheetWeek[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.personId) qs.set('personId', params.personId);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return httpGet<TimesheetWeek[]>(`/timesheets/approval${query}`);
}

export async function approveTimesheet(id: string): Promise<TimesheetWeek> {
  return httpPost<TimesheetWeek, Record<string, never>>(`/timesheets/${id}/approve`, {});
}

export async function rejectTimesheet(id: string, reason: string): Promise<TimesheetWeek> {
  return httpPost<TimesheetWeek, { reason: string }>(`/timesheets/${id}/reject`, { reason });
}

export async function fetchTimeReport(params?: {
  from?: string;
  to?: string;
  projectId?: string;
  personId?: string;
}): Promise<TimeReportData> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.projectId) qs.set('projectId', params.projectId);
  if (params?.personId) qs.set('personId', params.personId);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return httpGet<TimeReportData>(`/reports/time${query}`);
}
