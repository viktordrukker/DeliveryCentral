import { httpGet, httpPut } from './http-client';

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
