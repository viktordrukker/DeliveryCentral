import { SetMetadata } from '@nestjs/common';

import type { ReadActionKind } from './responsibility-resolver.service';

/**
 * F-5.3 / D-158 — declares a GET endpoint's read action kind.
 *
 * When `flag.rbac.responsibilityRule.reads.enabled` is ON, the
 * `RbacGuard` consults `responsibility_rules` rows for this kind via
 * `ReadAccessResolverService`, expanding or narrowing the static
 * `@RequireRoles` set per tenant policy. When the flag is OFF the
 * decorator is inert — handy for declaring metadata during the soak
 * window before flipping the master switch.
 *
 * Action kinds are entity-scoped (READ_PROJECT, READ_PERSON, …) rather
 * than route-scoped to keep the admin surface manageable. A future
 * refinement could add a `scope` qualifier (e.g. `READ_PROJECT.detail`
 * vs `READ_PROJECT.list`).
 */
export const READ_ACTION_KEY = 'read_action_kind';

export function ReadAction(kind: ReadActionKind) {
  return SetMetadata(READ_ACTION_KEY, kind);
}
