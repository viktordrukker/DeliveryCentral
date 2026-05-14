import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '@src/shared/persistence/prisma.module';

import { RolePresetsService } from './role-presets.service';

/**
 * F-5.2 / D-130 step 2 — exports the singleton `RolePresetsService` so
 * `RbacGuard` and the admin endpoint can resolve preset overrides
 * without each consuming module declaring it explicitly.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [RolePresetsService],
  exports: [RolePresetsService],
})
export class RolePresetsModule {}
