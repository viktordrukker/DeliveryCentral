import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { FeatureFlagsAdminController } from './feature-flags.controller';

/**
 * Sprint F-1.1 — admin surface for the 88-flag registry.
 *
 * PlatformFlagsService is provided by the global `AppConfigModule`, so this
 * module only needs PrismaService for the PlatformSetting upsert.
 */
@Module({
  controllers: [FeatureFlagsAdminController],
  providers: [PrismaService],
})
export class AdminFeatureFlagsModule {}
