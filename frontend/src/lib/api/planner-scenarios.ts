import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

/** Issue 266 — Distribution Studio planner-scenario shapes. */
export interface PlannerScenarioProposedAssignmentDto {
  positionId: string;
  personId: string;
  startDate: string;
  endDate: string;
  allocationPercent: number;
}

export interface PlannerScenarioStateDto {
  proposedAssignments: PlannerScenarioProposedAssignmentDto[];
  baselineSnapshotId?: string | null;
}

export interface PlannerScenarioSummaryDto {
  assignments: number;
  hires: number;
  releases: number;
  extensions: number;
  anomalies: number;
}

export interface PlannerScenarioDto {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  state: PlannerScenarioStateDto;
  summary: PlannerScenarioSummaryDto;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlannerScenarioRequest {
  name: string;
  description?: string | null;
  state?: PlannerScenarioStateDto;
}

export interface UpdatePlannerScenarioRequest {
  name?: string;
  description?: string | null;
  state?: PlannerScenarioStateDto;
}

export async function listScenarios(params: { ownedByMe?: boolean } = {}): Promise<PlannerScenarioDto[]> {
  const qs = new URLSearchParams();
  if (params.ownedByMe) qs.set('owner', 'me');
  const suffix = qs.toString();
  return httpGet<PlannerScenarioDto[]>(`/staffing/scenarios${suffix ? `?${suffix}` : ''}`);
}

export async function getScenario(id: string): Promise<PlannerScenarioDto> {
  return httpGet<PlannerScenarioDto>(`/staffing/scenarios/${id}`);
}

export async function createScenario(body: CreatePlannerScenarioRequest): Promise<PlannerScenarioDto> {
  return httpPost<PlannerScenarioDto, CreatePlannerScenarioRequest>('/staffing/scenarios', body);
}

export async function updateScenario(
  id: string,
  body: UpdatePlannerScenarioRequest,
): Promise<PlannerScenarioDto> {
  return httpPatch<PlannerScenarioDto, UpdatePlannerScenarioRequest>(`/staffing/scenarios/${id}`, body);
}

export async function deleteScenario(id: string): Promise<void> {
  return httpDelete(`/staffing/scenarios/${id}`);
}

/** Issue 269 — apply a scenario transactionally. */
export interface ApplyScenarioResponse {
  scenarioId: string;
  appliedAt: string;
  assignmentsCreated: number;
  assignmentsUpdated: number;
  assignmentsReleased: number;
}

export async function applyScenario(id: string): Promise<ApplyScenarioResponse> {
  return httpPost<ApplyScenarioResponse, Record<string, never>>(
    `/staffing/scenarios/${id}/apply`,
    {},
  );
}

/** Issue 267 — solver. */
export type SolverStrategy = 'BALANCED' | 'BEST_FIT' | 'UTILIZE_BENCH' | 'CHEAPEST' | 'GROWTH';

export interface SolverRunRequest {
  scenarioId: string;
  strategy: SolverStrategy;
  constraints?: Record<string, unknown>;
}

export interface SolverRunResponse {
  proposedSegmentChanges: PlannerScenarioProposedAssignmentDto[];
  score: number;
  explanation: string;
}

export async function runSolver(body: SolverRunRequest): Promise<SolverRunResponse> {
  return httpPost<SolverRunResponse, SolverRunRequest>('/staffing/solver/run', body);
}
