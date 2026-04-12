import { httpGet } from './http-client';
import { PersonDirectoryItem } from './person-directory';

export interface ManagerScopeResponse {
  directReports: PersonDirectoryItem[];
  dottedLinePeople: PersonDirectoryItem[];
  managerId: string;
  page: number;
  pageSize: number;
  totalDirectReports: number;
  totalDottedLinePeople: number;
}

export interface ManagerScopeQuery {
  asOf?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchManagerScope(
  managerId: string,
  query: ManagerScopeQuery = {},
): Promise<ManagerScopeResponse> {
  const params = new URLSearchParams();

  if (query.page) {
    params.set('page', String(query.page));
  }

  if (query.pageSize) {
    params.set('pageSize', String(query.pageSize));
  }

  if (query.asOf) {
    params.set('asOf', query.asOf);
  }

  const suffix = params.toString();

  return httpGet<ManagerScopeResponse>(
    `/org/managers/${managerId}/scope${suffix ? `?${suffix}` : ''}`,
  );
}
