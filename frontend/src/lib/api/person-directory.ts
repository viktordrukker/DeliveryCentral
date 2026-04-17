import { httpGet, httpPost } from './http-client';

export interface PersonSummary {
  displayName: string;
  id: string;
}

export interface OrgUnitSummary {
  code: string;
  id: string;
  name: string;
}

export interface PersonDirectoryItem {
  currentAssignmentCount: number;
  currentLineManager: PersonSummary | null;
  currentOrgUnit: OrgUnitSummary | null;
  displayName: string;
  dottedLineManagers: PersonSummary[];
  grade: string | null;
  hiredAt: string | null;
  id: string;
  lifecycleStatus: string;
  primaryEmail: string | null;
  resourcePoolIds: string[];
  resourcePools: Array<{ id: string; name: string }>;
  role: string | null;
  terminatedAt: string | null;
}

export interface PersonDirectoryResponse {
  items: PersonDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EmployeeLifecycleRecord {
  email: string;
  grade?: string | null;
  id: string;
  name: string;
  orgUnitId: string;
  role?: string | null;
  skillsets: string[];
  status: string;
}

export interface CreateEmployeeRequest {
  email: string;
  grade?: string;
  hireDate?: string;
  jobTitle?: string;
  lineManagerId?: string;
  location?: string;
  name: string;
  orgUnitId: string;
  role?: string;
  skillsets?: string[];
}

export interface PersonDirectoryQuery {
  departmentId?: string;
  page?: number;
  pageSize?: number;
  resourcePoolId?: string;
  role?: string;
}

export async function fetchPersonDirectory(
  query: PersonDirectoryQuery = {},
): Promise<PersonDirectoryResponse> {
  const params = new URLSearchParams();

  if (query.page) {
    params.set('page', String(query.page));
  }

  if (query.pageSize) {
    params.set('pageSize', String(query.pageSize));
  }

  if (query.departmentId) {
    params.set('departmentId', query.departmentId);
  }

  if (query.resourcePoolId) {
    params.set('resourcePoolId', query.resourcePoolId);
  }

  if (query.role) {
    params.set('role', query.role);
  }

  const suffix = params.toString();
  return httpGet<PersonDirectoryResponse>(
    `/org/people${suffix ? `?${suffix}` : ''}`,
  );
}

export async function fetchPersonDirectoryById(id: string): Promise<PersonDirectoryItem> {
  return httpGet<PersonDirectoryItem>(`/org/people/${id}`);
}

export async function createEmployee(
  request: CreateEmployeeRequest,
): Promise<EmployeeLifecycleRecord> {
  return httpPost<EmployeeLifecycleRecord, CreateEmployeeRequest>('/org/people', request);
}

export async function deactivateEmployee(id: string): Promise<EmployeeLifecycleRecord> {
  return httpPost<EmployeeLifecycleRecord, Record<string, never>>(
    `/org/people/${id}/deactivate`,
    {},
  );
}

export async function terminateEmployee(
  id: string,
  request: { actorId?: string; reason?: string; terminatedAt?: string },
): Promise<EmployeeLifecycleRecord> {
  return httpPost<EmployeeLifecycleRecord, typeof request>(`/org/people/${id}/terminate`, request);
}
