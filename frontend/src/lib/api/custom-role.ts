import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

// NEW-LGL-3 — admin client for tenant-defined custom roles.

export type PlatformRole =
  | 'admin'
  | 'director'
  | 'hr_manager'
  | 'delivery_manager'
  | 'project_manager'
  | 'resource_manager'
  | 'employee';

export interface CustomRole {
  id: string;
  publicId: string | null;
  roleKey: string;
  displayName: string;
  description: string | null;
  inheritedRoles: PlatformRole[];
  isBuiltIn: boolean;
  active: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
}

export interface BuiltInRoleDescriptor {
  roleKey: PlatformRole;
  displayName: string;
  description: string;
  isBuiltIn: true;
  active: true;
}

export interface CreateCustomRoleRequest {
  roleKey: string;
  displayName: string;
  description?: string | null;
  inheritedRoles: PlatformRole[];
}

export interface UpdateCustomRoleRequest {
  displayName?: string;
  description?: string | null;
  inheritedRoles?: PlatformRole[];
}

export async function listCustomRoles(): Promise<CustomRole[]> {
  return httpGet<CustomRole[]>('/admin/custom-roles');
}

export async function listBuiltInRoles(): Promise<BuiltInRoleDescriptor[]> {
  return httpGet<BuiltInRoleDescriptor[]>('/admin/custom-roles/built-in');
}

export async function listAvailablePermissions(): Promise<PlatformRole[]> {
  return httpGet<PlatformRole[]>('/admin/custom-roles/available-permissions');
}

export async function fetchCustomRole(id: string): Promise<CustomRole> {
  return httpGet<CustomRole>(`/admin/custom-roles/${id}`);
}

export async function createCustomRole(data: CreateCustomRoleRequest): Promise<CustomRole> {
  return httpPost<CustomRole, CreateCustomRoleRequest>('/admin/custom-roles', data);
}

export async function updateCustomRole(
  id: string,
  data: UpdateCustomRoleRequest,
): Promise<CustomRole> {
  return httpPatch<CustomRole, UpdateCustomRoleRequest>(`/admin/custom-roles/${id}`, data);
}

export async function deactivateCustomRole(
  id: string,
  assignedCount = 0,
): Promise<CustomRole> {
  const qs = assignedCount > 0 ? `?assignedCount=${assignedCount}` : '';
  return httpDelete<CustomRole>(`/admin/custom-roles/${id}${qs}`);
}

export async function reactivateCustomRole(id: string): Promise<CustomRole> {
  return httpPost<CustomRole, Record<string, never>>(`/admin/custom-roles/${id}/reactivate`, {});
}
