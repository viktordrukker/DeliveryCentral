import { httpGet } from './http-client';

/* ── Summary types (from /overtime/summary) ── */

export interface OvertimePersonSummary {
  personId: string;
  displayName: string;
  departmentId: string | null;
  departmentName: string | null;
  poolId: string | null;
  poolName: string | null;
  totalHours: number;
  standardHours: number;
  overtimeHours: number;
  effectiveThreshold: number;
  exceedsThreshold: boolean;
  hasException: boolean;
  weekBreakdown: Array<{ weekStart: string; total: number; standard: number; overtime: number }>;
}

export interface OvertimeProjectSummary {
  projectId: string;
  projectCode: string;
  projectName: string;
  overtimeHours: number;
  contributorCount: number;
}

export interface OvertimeDeptSummary {
  orgUnitId: string;
  orgUnitName: string;
  personCount: number;
  totalOvertimeHours: number;
  overtimeRate: number;
  policyMaxHours: number | null;
  exceedingPolicyCount: number;
}

export interface OvertimePoolSummary {
  poolId: string;
  poolName: string;
  personCount: number;
  totalOvertimeHours: number;
  overtimeRate: number;
  policyMaxHours: number | null;
  exceedingPolicyCount: number;
}

export interface PendingOvertimeException {
  caseId: string;
  personId: string;
  personName: string;
  requestedMaxHours: number;
  reason: string;
  requestedAt: string;
}

export interface OvertimeSummaryResponse {
  weekStart: string;
  weekEnd: string;
  weeksIncluded: number;
  totalOvertimeHours: number;
  totalStandardHours: number;
  overtimeRate: number;
  peopleWithOvertime: number;
  peopleExceedingCap: number;
  personSummaries: OvertimePersonSummary[];
  projectSummaries: OvertimeProjectSummary[];
  departmentSummaries: OvertimeDeptSummary[];
  poolSummaries: OvertimePoolSummary[];
  pendingExceptions: PendingOvertimeException[];
}

/* ── Policy types ── */

export interface OvertimePolicy {
  id: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
  resourcePoolId: string | null;
  resourcePoolName: string | null;
  standardHoursPerWeek: number;
  maxOvertimeHoursPerWeek: number;
  setByPersonId: string;
  setByDisplayName: string;
  approvalStatus: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface ResolvedOvertimePolicy {
  standardHoursPerWeek: number;
  maxOvertimeHoursPerWeek: number;
  source: string;
  sourceId: string | null;
  sourceName: string | null;
}

/* ── Fetch functions ── */

export async function fetchOvertimeSummary(query: { weeks?: number; asOf?: string } = {}): Promise<OvertimeSummaryResponse> {
  const params = new URLSearchParams();
  if (query.weeks) params.set('weeks', String(query.weeks));
  if (query.asOf) params.set('asOf', query.asOf);
  const suffix = params.toString();
  return httpGet<OvertimeSummaryResponse>(`/overtime/summary${suffix ? `?${suffix}` : ''}`);
}

export async function fetchOvertimePolicies(): Promise<OvertimePolicy[]> {
  return httpGet<OvertimePolicy[]>('/overtime/policy');
}

export async function fetchResolvedPolicy(personId: string): Promise<ResolvedOvertimePolicy> {
  return httpGet<ResolvedOvertimePolicy>(`/overtime/resolve/${personId}`);
}
