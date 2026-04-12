import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

export interface ResourcePoolMember {
  displayName: string;
  personId: string;
  validFrom: string;
}

export interface ResourcePool {
  code: string;
  description: string | null;
  id: string;
  members: ResourcePoolMember[];
  name: string;
  orgUnitId: string | null;
}

export interface ResourcePoolListResponse {
  items: ResourcePool[];
}

export interface CreateResourcePoolRequest {
  code: string;
  description?: string;
  name: string;
  orgUnitId?: string;
}

export interface UpdateResourcePoolRequest {
  description?: string;
  name?: string;
}

export async function fetchResourcePools(): Promise<ResourcePoolListResponse> {
  return httpGet<ResourcePoolListResponse>('/resource-pools');
}

export async function fetchResourcePoolById(id: string): Promise<ResourcePool> {
  return httpGet<ResourcePool>(`/resource-pools/${id}`);
}

export async function createResourcePool(request: CreateResourcePoolRequest): Promise<ResourcePool> {
  return httpPost<ResourcePool, CreateResourcePoolRequest>('/resource-pools', request);
}

export async function updateResourcePool(id: string, request: UpdateResourcePoolRequest): Promise<ResourcePool> {
  return httpPatch<ResourcePool, UpdateResourcePoolRequest>(`/resource-pools/${id}`, request);
}

export async function addResourcePoolMember(poolId: string, personId: string): Promise<ResourcePool> {
  return httpPost<ResourcePool, { personId: string }>(`/resource-pools/${poolId}/members`, { personId });
}

export async function removeResourcePoolMember(poolId: string, personId: string): Promise<ResourcePool> {
  return httpDelete<ResourcePool>(`/resource-pools/${poolId}/members/${personId}`);
}
