import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

/**
 * F-5.1 / D-130 step 1 — canonical RBAC role presets.
 *
 * Every `@RequireRoles(...)` call with two or more literal role strings
 * MUST spread one of these presets instead. The CI guardrail
 * `scripts/check-role-literals.cjs` blocks regressions.
 *
 * F-5.2 (D-130 step 2) overlays these constants with a PlatformSetting
 * (`responsibilityMatrix.<preset>.roles`) so tenant admins can override
 * a default at runtime without editing code.
 */

/** Director + admin — top-level governance only. */
export const EXEC_ROLES: readonly PlatformRole[] = ['director', 'admin'] as const;

/** HR + director + admin — people-data governance. */
export const HR_GOVERNANCE_ROLES: readonly PlatformRole[] = [
  'hr_manager',
  'director',
  'admin',
] as const;

/** Delivery + director + admin — delivery-side approval. */
export const DELIVERY_EXEC_ROLES: readonly PlatformRole[] = [
  'delivery_manager',
  'director',
  'admin',
] as const;

/** RM + director + admin — capacity governance. */
export const RM_EXEC_ROLES: readonly PlatformRole[] = [
  'resource_manager',
  'director',
  'admin',
] as const;

/** PM + DM + director + admin — project + delivery decisions. */
export const PROJECT_DELIVERY_ROLES: readonly PlatformRole[] = [
  'project_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

/** PM + RM + DM + director + admin — full staffing-flow surface. */
export const STAFFING_ROLES: readonly PlatformRole[] = [
  'project_manager',
  'resource_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

/** Every manager-track role (no employee). */
export const ALL_MANAGER_ROLES: readonly PlatformRole[] = [
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

/** Every authenticated role — equivalent to "any signed-in person". */
export const ALL_AUTHENTICATED_ROLES: readonly PlatformRole[] = [
  'employee',
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

/** Budget-aware: PM + DM + director + admin. */
export const BUDGET_ROLES: readonly PlatformRole[] = [
  'admin',
  'project_manager',
  'delivery_manager',
  'director',
] as const;

/** Budget request creators: PM + DM + admin (no director — they decide). */
export const BUDGET_REQUEST_ROLES: readonly PlatformRole[] = [
  'admin',
  'project_manager',
  'delivery_manager',
] as const;

/** Budget deciders: director + admin only. */
export const BUDGET_DECIDE_ROLES: readonly PlatformRole[] = ['admin', 'director'] as const;
