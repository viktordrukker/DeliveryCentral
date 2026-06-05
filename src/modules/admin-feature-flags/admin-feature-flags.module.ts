import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { FeatureFlagAdminService } from './application/feature-flag-admin.service';
import { FeatureFlagsAdminController } from './feature-flags.controller';

/**
 * Sprint F-1.1 — admin surface for the 88-flag registry.
 *
 * PlatformFlagsService is provided by the global `AppConfigModule`, so this
 * module only needs PrismaService for the PlatformSetting upsert.
 *
 * LEAN-P4d-2 — registers FeatureFlagAdminService so list/toggle logic is
 * unit-testable independent of HTTP.
 */
@Module({
  controllers: [FeatureFlagsAdminController],
  providers: [FeatureFlagAdminService, PrismaService],
})
export class AdminFeatureFlagsModule {}
