export const PLATFORM_ROLES = [
  'employee',
  'project_manager',
  'resource_manager',
  'director',
  'hr_manager',
  'delivery_manager',
  'admin',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export function isPlatformRole(value: string): value is PlatformRole {
  return PLATFORM_ROLES.includes(value as PlatformRole);
}
