import { Module } from '@nestjs/common';

import { AppConfigModule } from '@src/shared/config/app-config.module';
import { PrismaModule } from '@src/shared/persistence/prisma.module';
import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';

import { DiagnosticBundleService } from './application/diagnostic-bundle.service';
import { PreflightChecksService } from './application/preflight-checks';
import { SetupLoggerService } from './application/setup-logger.service';
import { SetupService } from './application/setup.service';
import { SetupTokenGuard } from './application/setup-guard';
import { SetupTokenService } from './application/setup-token.service';
import { ApplyAdminOnlySeedsRunner } from './application/seed-runners/apply-admin-only-seeds';
import { ApplyDemoSeedsRunner } from './application/seed-runners/apply-demo-seeds';
import { ApplyInfrastructureSeedsRunner } from './application/seed-runners/apply-infrastructure-seeds';
import { SETUP_RUNS_REPOSITORY } from './application/tokens';
import { PrismaSetupRunsRepository } from './infrastructure/prisma-setup-runs.repository';
import { SetupController } from './presentation/setup.controller';

@Module({
  imports: [PrismaModule, AppConfigModule, PlatformSettingsModule],
  controllers: [SetupController],
  providers: [
    SetupService,
    SetupTokenService,
    SetupLoggerService,
    SetupTokenGuard,
    PreflightChecksService,
    DiagnosticBundleService,
    ApplyInfrastructureSeedsRunner,
    ApplyDemoSeedsRunner,
    ApplyAdminOnlySeedsRunner,
    {
      provide: SETUP_RUNS_REPOSITORY,
      useClass: PrismaSetupRunsRepository,
    },
  ],
  exports: [SetupService, SetupTokenService],
})
export class SetupModule {}
