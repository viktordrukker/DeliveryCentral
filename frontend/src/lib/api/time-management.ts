import { httpGet } from './http-client';

export interface ApprovalQueueItem {
  id: string;
  type: 'timesheet' | 'leave';
  personId: string;
  personName: string;
  weekStart?: string;
  totalHours?: number;
  overtimeHours?: number;
  status: string;
  submittedAt: string | null;
  leaveType?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  leaveDays?: number;
  notes?: string;
}

export interface TeamCalendarDay {
  date: string;
  type: string;
}

export interface TeamCalendarPerson {
  personId: string;
  displayName: string;
  days: TeamCalendarDay[];
}

export interface ComplianceRow {
  personId: string;
  displayName: string;
  totalWeeks: number;
  submittedWeeks: number;
  approvedWeeks: number;
  rejectedWeeks: number;
  draftWeeks: number;
  reportedHours: number;
  expectedHours: number;
  gapDays: number;
  overtimeHours: number;
  leaveDays: number;
  status: 'compliant' | 'partial' | 'non-compliant';
}

export async function fetchApprovalQueue(month?: string, status?: string): Promise<ApprovalQueueItem[]> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (status) params.set('status', status);
  const suffix = params.toString();
  return httpGet<ApprovalQueueItem[]>(`/time-management/queue${suffix ? `?${suffix}` : ''}`);
}

export async function fetchTeamCalendar(month: string): Promise<TeamCalendarPerson[]> {
  return httpGet<TeamCalendarPerson[]>(`/time-management/team-calendar?month=${month}`);
}

export async function fetchCompliance(month: string): Promise<ComplianceRow[]> {
  return httpGet<ComplianceRow[]>(`/time-management/compliance?month=${month}`);
}
