import { httpDelete, httpGet, httpPost } from './http-client';

export interface RolePlanEntryDto {
  id: string;
  projectId: string;
  roleName: string;
  seniorityLevel: string | null;
  headcount: number;
  allocationPercent: number | null;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  requiredSkillIds: string[];
  source: string;
  notes: string | null;
}

export interface UpsertRolePlanEntryRequest {
  roleName: string;
  seniorityLevel?: string;
  headcount?: number;
  allocationPercent?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  requiredSkillIds?: string[];
  source?: string;
  notes?: string;
}

export interface RolePlanComparisonRow {
  roleName: string;
  seniorityLevel: string | null;
  plannedHeadcount: number;
  internalFilled: number;
  vendorFilled: number;
  totalFilled: number;
  fillRate: number;
  gap: number;
  status: 'FILLED' | 'PARTIAL' | 'UNFILLED';
}

export interface RolePlanComparisonResult {
  rows: RolePlanComparisonRow[];
  overallFillRate: number;
  totalPlanned: number;
  totalFilled: number;
  totalGap: number;
}

export interface StaffingSummary {
  totalPlanned: number;
  totalInternalFilled: number;
  totalVendorFilled: number;
  totalFilled: number;
  fillRate: number;
  totalGap: number;
}

export interface GenerateRequestsResult {
  createdRequestIds: string[];
  skippedCount: number;
  totalGaps: number;
}

export async function fetchRolePlan(projectId: string): Promise<RolePlanEntryDto[]> {
  return httpGet<RolePlanEntryDto[]>(`/projects/${projectId}/role-plan`);
}

export async function upsertRolePlan(projectId: string, entries: UpsertRolePlanEntryRequest[]): Promise<RolePlanEntryDto[]> {
  return httpPost<RolePlanEntryDto[], UpsertRolePlanEntryRequest[]>(`/projects/${projectId}/role-plan`, entries);
}

export async function deleteRolePlanEntry(projectId: string, entryId: string): Promise<void> {
  return httpDelete(`/projects/${projectId}/role-plan/${entryId}`);
}

export async function fetchRolePlanComparison(projectId: string): Promise<RolePlanComparisonResult> {
  return httpGet<RolePlanComparisonResult>(`/projects/${projectId}/role-plan/comparison`);
}

export async function fetchStaffingSummary(projectId: string): Promise<StaffingSummary> {
  return httpGet<StaffingSummary>(`/projects/${projectId}/staffing-summary`);
}

export async function generateRequestsFromPlan(projectId: string): Promise<GenerateRequestsResult> {
  return httpPost<GenerateRequestsResult, Record<string, never>>(`/projects/${projectId}/role-plan/generate-requests`, {});
}
