import { httpGet, httpPut } from './http-client';

/**
 * F-5.2 + F-5.4 / D-130 step 2 + D-159 — role-preset overrides.
 *
 * The admin endpoint backs `RolePermissionAdminPage` (`/admin/access-policies/edit`)
 * where tenant admins can override the role list behind any named preset.
 * Wraps `GET /admin/role-presets[/:preset]` and `PUT /admin/role-presets/:preset`.
 */

export type PlatformRole =
  | 'employee'
  | 'project_manager'
  | 'resource_manager'
  | 'hr_manager'
  | 'delivery_manager'
  | 'director'
  | 'admin';

export const ALL_PLATFORM_ROLES: PlatformRole[] = [
  'employee',
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
];

export interface RolePresetView {
  preset: string;
  defaults: PlatformRole[];
  effective: PlatformRole[];
  overridden: boolean;
}

export async function fetchRolePresets(): Promise<RolePresetView[]> {
  return httpGet<RolePresetView[]>('/admin/role-presets');
}

export async function fetchRolePreset(preset: string): Promise<RolePresetView> {
  return httpGet<RolePresetView>(`/admin/role-presets/${preset}`);
}

export async function setRolePresetOverride(
  preset: string,
  roles: PlatformRole[] | null,
): Promise<RolePresetView> {
  return httpPut<RolePresetView, { roles: PlatformRole[] | null }>(
    `/admin/role-presets/${preset}`,
    { roles },
  );
}
