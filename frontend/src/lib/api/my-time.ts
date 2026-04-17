import { httpGet, httpPost } from './http-client';

/* ── Monthly view types ── */

export interface MonthlyEntry {
  id: string;
  date: string;
  hours: number;
  projectId: string;
  projectCode: string;
  projectName: string;
  assignmentId: string | null;
  benchCategory: string | null;
  capex: boolean;
  description: string | null;
}

export interface MonthlyWeek {
  id: string;
  weekStart: string;
  status: string;
  totalHours: number | null;
  overtimeHours: number | null;
}

export interface MonthlyLeaveDay {
  date: string;
  type: string;
  status: string;
}

export interface MonthlyAssignmentRow {
  assignmentId: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  allocationPercent: number;
  isBench: boolean;
  benchCategory: string | null;
}

export interface MonthlySummary {
  workingDays: number;
  expectedHours: number;
  reportedHours: number;
  standardHours: number;
  overtimeHours: number;
  leaveHours: number;
  benchHours: number;
  gapHours: number;
  gapDays: number;
  utilizationPercent: number;
  byProject: Array<{ projectId: string; projectCode: string; projectName: string; hours: number; percent: number }>;
}

export interface MonthlyTimesheetResponse {
  personId: string;
  year: number;
  month: number;
  weeks: MonthlyWeek[];
  entries: MonthlyEntry[];
  assignmentRows: MonthlyAssignmentRow[];
  leaveDays: MonthlyLeaveDay[];
  holidays: Array<{ date: string; name: string }>;
  gaps: TimeGap[];
  summary: MonthlySummary;
}

/* ── Gap types ── */

export interface GapSuggestion {
  type: 'assignment' | 'bench' | 'leave';
  label: string;
  hours: number;
  projectId?: string;
  projectCode?: string;
  benchCategory?: string;
}

export interface TimeGap {
  date: string;
  dayOfWeek: string;
  expectedHours: number;
  reportedHours: number;
  gapHours: number;
  isHoliday: boolean;
  isLeave: boolean;
  leaveType: string | null;
  suggestions: GapSuggestion[];
}

/* ── Public holiday ── */

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  countryCode: string;
}

/* ── Fetch functions ── */

export async function fetchMonthlyTimesheet(month: string, personId?: string): Promise<MonthlyTimesheetResponse> {
  const params = new URLSearchParams({ month });
  if (personId) params.set('personId', personId);
  return httpGet<MonthlyTimesheetResponse>(`/my-time/month?${params}`);
}

export async function autoFillMonth(month: string): Promise<{ filledDays: number; filledHours: number }> {
  return httpPost<{ filledDays: number; filledHours: number }, Record<string, never>>(`/my-time/auto-fill?month=${month}`, {});
}

export async function copyPreviousMonth(month: string): Promise<{ copiedDays: number; copiedHours: number }> {
  return httpPost<{ copiedDays: number; copiedHours: number }, Record<string, never>>(`/my-time/copy-previous?month=${month}`, {});
}

export async function fetchTimeGaps(month: string, personId?: string): Promise<TimeGap[]> {
  const params = new URLSearchParams({ month });
  if (personId) params.set('personId', personId);
  return httpGet<TimeGap[]>(`/my-time/gaps?${params}`);
}

export async function fetchPublicHolidays(year?: number, country?: string): Promise<PublicHoliday[]> {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (country) params.set('country', country);
  const suffix = params.toString();
  return httpGet<PublicHoliday[]>(`/public-holidays${suffix ? `?${suffix}` : ''}`);
}
