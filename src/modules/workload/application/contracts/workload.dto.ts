export interface WorkloadAllocationDto {
  projectId: string;
  projectName: string;
  allocationPercent: number;
}

export interface WorkloadPersonDto {
  id: string;
  displayName: string;
  allocations: WorkloadAllocationDto[];
}

export interface WorkloadProjectDto {
  id: string;
  name: string;
  projectCode: string;
}

export interface WorkloadMatrixResponse {
  people: WorkloadPersonDto[];
  projects: WorkloadProjectDto[];
}

export interface WorkloadPlanningAssignmentDto {
  id: string;
  projectId: string;
  projectName: string;
  allocationPercent: number;
  validFrom: string;
  validTo: string | null;
  status: string;
}

export interface WorkloadPlanningPersonDto {
  id: string;
  displayName: string;
  assignments: WorkloadPlanningAssignmentDto[];
}

export interface WorkloadPlanningResponse {
  people: WorkloadPlanningPersonDto[];
  weeks: string[];
}
