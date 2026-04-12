import { httpGet } from './http-client';

export interface WorkloadAllocation {
  projectId: string;
  projectName: string;
  allocationPercent: number;
}

export interface WorkloadPerson {
  id: string;
  displayName: string;
  allocations: WorkloadAllocation[];
}

export interface WorkloadProject {
  id: string;
  name: string;
  projectCode: string;
}

export interface WorkloadMatrixResponse {
  people: WorkloadPerson[];
  projects: WorkloadProject[];
}

export interface WorkloadPlanningAssignment {
  id: string;
  projectId: string;
  projectName: string;
  allocationPercent: number;
  validFrom: string;
  validTo: string | null;
  status: string;
}

export interface WorkloadPlanningPerson {
  id: string;
  displayName: string;
  assignments: WorkloadPlanningAssignment[];
}

export interface WorkloadPlanningResponse {
  people: WorkloadPlanningPerson[];
  weeks: string[];
}

export async function fetchWorkloadMatrix(params?: {
  poolId?: string;
  orgUnitId?: string;
  managerId?: string;
}): Promise<WorkloadMatrixResponse> {
  const query = new URLSearchParams();
  if (params?.poolId) query.set('poolId', params.poolId);
  if (params?.orgUnitId) query.set('orgUnitId', params.orgUnitId);
  if (params?.managerId) query.set('managerId', params.managerId);

  const qs = query.toString();
  return httpGet<WorkloadMatrixResponse>(`/workload/matrix${qs ? `?${qs}` : ''}`);
}

export async function fetchWorkloadPlanning(params?: {
  from?: string;
  to?: string;
  poolId?: string;
}): Promise<WorkloadPlanningResponse> {
  const query = new URLSearchParams();
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.poolId) query.set('poolId', params.poolId);

  const qs = query.toString();
  return httpGet<WorkloadPlanningResponse>(`/workload/planning${qs ? `?${qs}` : ''}`);
}

export interface CapacityForecastWeek {
  week: string;
  projectedBench: number;
  atRiskPeople: Array<{ personId: string; displayName: string; assignmentEndsAt: string }>;
  expectedAbsorptionDays: number;
}

export async function fetchCapacityForecast(params?: {
  weeks?: number;
  poolId?: string;
}): Promise<CapacityForecastWeek[]> {
  const query = new URLSearchParams();
  if (params?.weeks) query.set('weeks', String(params.weeks));
  if (params?.poolId) query.set('poolId', params.poolId);

  const qs = query.toString();
  return httpGet<CapacityForecastWeek[]>(`/workload/capacity-forecast${qs ? `?${qs}` : ''}`);
}
