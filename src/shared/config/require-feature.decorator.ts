import { SetMetadata } from '@nestjs/common';

import type { PlatformFlagId } from './platform-flags.service';

export const REQUIRED_FEATURES_KEY = 'required_feature_flags';

/**
 * Sprint F-0.1 — controller-level feature flag gate.
 *
 * Usage:
 *   @RequireFeature('staffingProposalSlate')
 *   @Post('/staffing-requests/:id/proposals')
 *   async addProposal(...) { ... }
 *
 * When the named flag (or ANY flag in the list) returns false at request
 * time, FeatureFlagGuard returns 404 (not 403) — toggled-off features
 * are invisible, not forbidden. This matches ULTIMATE Layer D.
 *
 * Multiple flags are AND-combined: every flag must be ON for the
 * endpoint to be reachable. Use a parent flag for OR-style gating.
 */
export function RequireFeature(...features: PlatformFlagId[]) {
  return SetMetadata(REQUIRED_FEATURES_KEY, features);
}
