import { httpGet, httpPost, httpPut } from './http-client';

export interface ProjectBudget {
  id: string;
  projectId: string;
  fiscalYear: number;
  capexBudget: number;
  opexBudget: number;
}

export interface BurnDownPoint {
  week: string;
  cumCost: number;
  budgetLine: number;
}

export interface ForecastData {
  projectedTotalCost: number;
  remainingBudget: number;
  onTrack: boolean;
}

export interface CostByRole {
  role: string;
  hours: number;
  cost: number;
}

export interface ProjectBudgetDashboard {
  budget: { capex: number; opex: number; total: number; fiscalYear: number } | null;
  burnDown: BurnDownPoint[];
  forecast: ForecastData;
  byRole: CostByRole[];
  healthColor: 'green' | 'yellow' | 'red';
}

export interface UpsertProjectBudgetInput {
  fiscalYear: number;
  capexBudget: number;
  opexBudget: number;
  // EPIC G — optional vendor (third-party) budget + reporting currency.
  vendorBudget?: number;
  currencyCode?: string;
}

export async function upsertProjectBudget(
  projectId: string,
  input: UpsertProjectBudgetInput,
): Promise<ProjectBudget> {
  return httpPut<ProjectBudget, UpsertProjectBudgetInput>(`/projects/${projectId}/budget`, input);
}

export async function fetchProjectBudgetDashboard(
  projectId: string,
): Promise<ProjectBudgetDashboard> {
  return httpGet<ProjectBudgetDashboard>(`/projects/${projectId}/budget-dashboard`);
}

// F-3.1 / D-92 — budget change approvals
export interface BudgetChangeRequest {
  id: string;
  publicId: string | null;
  projectBudgetId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedByPersonId: string;
  requestedAt: string;
  requestedChange: { capexBudget: number; opexBudget: number } | null;
  decidedByPersonId: string | null;
  decisionAt: string | null;
  decisionReason: string | null;
}

export interface BudgetChangeDecisionResult {
  approvalId: string;
  status: 'APPROVED' | 'REJECTED';
  postDecisionBudget?: { capexBudget: number; opexBudget: number };
}

export async function fetchPendingBudgetChangeRequests(
  projectId: string,
): Promise<BudgetChangeRequest[]> {
  return httpGet<BudgetChangeRequest[]>(`/projects/${projectId}/budget-change-requests`);
}

export async function requestBudgetChange(
  projectId: string,
  input: { fiscalYear: number; capexBudget: number; opexBudget: number; reason?: string },
): Promise<{ approvalId: string; requestedChange: { capexBudget: number; opexBudget: number } }> {
  return httpPost<
    { approvalId: string; requestedChange: { capexBudget: number; opexBudget: number } },
    typeof input
  >(`/projects/${projectId}/budget-change-requests`, input);
}

export async function approveBudgetChange(
  projectId: string,
  approvalId: string,
  reason?: string,
): Promise<BudgetChangeDecisionResult> {
  return httpPost<BudgetChangeDecisionResult, { reason?: string }>(
    `/projects/${projectId}/budget-change-requests/${approvalId}/approve`,
    { reason },
  );
}

export async function rejectBudgetChange(
  projectId: string,
  approvalId: string,
  reason: string,
): Promise<BudgetChangeDecisionResult> {
  return httpPost<BudgetChangeDecisionResult, { reason: string }>(
    `/projects/${projectId}/budget-change-requests/${approvalId}/reject`,
    { reason },
  );
}
