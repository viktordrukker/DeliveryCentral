import { httpGet, httpPatch, httpPost } from './http-client';

export type RiskType = 'RISK' | 'ISSUE';
export type RiskCategory = 'SCOPE' | 'SCHEDULE' | 'BUDGET' | 'BUSINESS' | 'TECHNICAL' | 'OPERATIONAL';
export type RiskStrategy = 'MITIGATE' | 'ACCEPT' | 'TRANSFER' | 'AVOID' | 'ESCALATE';
export type RiskStatus = 'IDENTIFIED' | 'ASSESSED' | 'MITIGATING' | 'RESOLVED' | 'CLOSED' | 'CONVERTED_TO_ISSUE';

export interface ProjectRiskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  category: RiskCategory;
  riskType: RiskType;
  probability: number;
  impact: number;
  riskScore: number;
  strategy: RiskStrategy | null;
  strategyDescription: string | null;
  damageControlPlan: string | null;
  status: RiskStatus;
  ownerPersonId: string | null;
  ownerDisplayName: string | null;
  assigneePersonId: string | null;
  assigneeDisplayName: string | null;
  raisedAt: string;
  dueDate: string | null;
  resolvedAt: string | null;
  convertedFromRiskId: string | null;
  relatedCaseId: string | null;
}

export interface CreateRiskRequest {
  title: string;
  description?: string;
  category: RiskCategory;
  probability?: number;
  impact?: number;
  strategy?: RiskStrategy;
  strategyDescription?: string;
  damageControlPlan?: string;
  ownerPersonId?: string;
  dueDate?: string;
}

export interface UpdateRiskRequest {
  title?: string;
  description?: string;
  category?: RiskCategory;
  probability?: number;
  impact?: number;
  strategy?: RiskStrategy;
  strategyDescription?: string;
  damageControlPlan?: string;
  status?: RiskStatus;
  ownerPersonId?: string;
  assigneePersonId?: string;
  dueDate?: string;
}

export interface RiskMatrixCell {
  probability: number;
  impact: number;
  count: number;
  risks: Array<{ id: string; title: string }>;
}

export interface RiskSummaryDto {
  totalRisks: number;
  totalIssues: number;
  openRisks: number;
  openIssues: number;
  criticalCount: number;
  topRisks: ProjectRiskDto[];
}

export interface RiskListQuery {
  riskType?: RiskType;
  status?: RiskStatus;
  category?: RiskCategory;
}

export async function fetchRisks(projectId: string, query: RiskListQuery = {}): Promise<ProjectRiskDto[]> {
  const params = new URLSearchParams();
  if (query.riskType) params.set('riskType', query.riskType);
  if (query.status) params.set('status', query.status);
  if (query.category) params.set('category', query.category);
  const suffix = params.toString();
  return httpGet<ProjectRiskDto[]>(`/projects/${projectId}/risks${suffix ? `?${suffix}` : ''}`);
}

export async function createRisk(projectId: string, data: CreateRiskRequest): Promise<ProjectRiskDto> {
  return httpPost<ProjectRiskDto, CreateRiskRequest>(`/projects/${projectId}/risks`, data);
}

export async function updateRisk(projectId: string, riskId: string, data: UpdateRiskRequest): Promise<ProjectRiskDto> {
  return httpPatch<ProjectRiskDto, UpdateRiskRequest>(`/projects/${projectId}/risks/${riskId}`, data);
}

export async function convertRiskToIssue(projectId: string, riskId: string, assigneePersonId: string): Promise<ProjectRiskDto> {
  return httpPost<ProjectRiskDto, { assigneePersonId: string }>(`/projects/${projectId}/risks/${riskId}/convert-to-issue`, { assigneePersonId });
}

export async function resolveRisk(projectId: string, riskId: string): Promise<ProjectRiskDto> {
  return httpPost<ProjectRiskDto, Record<string, never>>(`/projects/${projectId}/risks/${riskId}/resolve`, {});
}

export async function closeRisk(projectId: string, riskId: string): Promise<ProjectRiskDto> {
  return httpPost<ProjectRiskDto, Record<string, never>>(`/projects/${projectId}/risks/${riskId}/close`, {});
}

export async function fetchRiskMatrix(projectId: string): Promise<RiskMatrixCell[]> {
  return httpGet<RiskMatrixCell[]>(`/projects/${projectId}/risks/matrix`);
}

export async function fetchRiskSummary(projectId: string): Promise<RiskSummaryDto> {
  return httpGet<RiskSummaryDto>(`/projects/${projectId}/risks/summary`);
}
