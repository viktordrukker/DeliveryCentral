import { SetMetadata } from '@nestjs/common';

import type { RolePresetName } from './role-presets';

/**
 * F-5.2 / D-130 step 2 — declares a role-preset requirement that the
 * `RbacGuard` resolves at request time via `RolePresetsService`.
 *
 * Behaves identically to `@RequireRoles(...PRESET)` at the default-role
 * set but additionally honors any tenant override stored in the
 * `responsibilityMatrix.<name>.roles` PlatformSetting.
 *
 * Combine freely with `@RequireRoles(...)`: when both are present, a
 * caller passes if EITHER decorator's role set matches. This lets a
 * route extend a preset with a one-off literal (e.g. `@RequireRolePreset
 * ('ALL_MANAGER_ROLES')` + `@RequireRoles('employee')`).
 */
export const REQUIRED_ROLE_PRESET_KEY = 'required_role_preset';

export function RequireRolePreset(preset: RolePresetName) {
  return SetMetadata(REQUIRED_ROLE_PRESET_KEY, preset);
}
