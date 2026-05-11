import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  PlatformFlagId,
  PlatformFlagsService,
} from './platform-flags.service';
import { REQUIRED_FEATURES_KEY } from './require-feature.decorator';

/**
 * Sprint F-0.1 — runtime gate for `@RequireFeature(...)`.
 *
 * Behaviour: returns 404 (not 403) when a required flag is OFF — a
 * toggled-off feature is invisible to clients, not forbidden. This
 * preserves the property that flag flips don't break clients that
 * don't know about the feature yet.
 *
 * Wire as a global guard in `AppConfigModule` AFTER `RbacGuard` so
 * authentication runs first.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly flags: PlatformFlagsService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<PlatformFlagId[]>(
      REQUIRED_FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    for (const feature of requiredFeatures) {
      const enabled = await this.flags.isEnabled(feature);
      if (!enabled) {
        // 404, not 403 — feature invisible.
        throw new NotFoundException();
      }
    }

    return true;
  }
}
