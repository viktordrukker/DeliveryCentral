import { Module } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { OrganizationModule } from '../../organization/organization.module';
import { InMemoryPersonRepository } from '../../organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { RadiusAccountSyncService } from './application/radius-account-sync.service';
import { RadiusReconciliationQueryService } from './application/radius-reconciliation-query.service';
import { RadiusStatusService } from './application/radius-status.service';
import { InMemoryRadiusAccountAdapter } from './infrastructure/adapters/in-memory-radius-account.adapter';
import { InMemoryExternalAccountLinkRepository } from './infrastructure/repositories/in-memory/in-memory-external-account-link.repository';
import { InMemoryRadiusReconciliationRecordRepository } from './infrastructure/repositories/in-memory/in-memory-radius-reconciliation-record.repository';
import { InMemoryRadiusSyncStateRepository } from './infrastructure/repositories/in-memory/in-memory-radius-sync-state.repository';
import { PrismaExternalAccountLinkRepository } from './infrastructure/repositories/prisma/prisma-external-account-link.repository';
import { PrismaRadiusReconciliationRecordRepository } from './infrastructure/repositories/prisma/prisma-radius-reconciliation-record.repository';
import { PrismaRadiusSyncStateRepository } from './infrastructure/repositories/prisma/prisma-radius-sync-state.repository';
import { RadiusController } from './presentation/radius.controller';

@Module({
  imports: [OrganizationModule],
  controllers: [RadiusController],
  providers: [
    {
      provide: InMemoryRadiusAccountAdapter,
      useValue: new InMemoryRadiusAccountAdapter(),
    },
    {
      provide: InMemoryExternalAccountLinkRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaExternalAccountLinkRepository(prisma.externalAccountLink),
      inject: [PrismaService],
    },
    {
      provide: InMemoryRadiusSyncStateRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaRadiusSyncStateRepository(prisma.integrationSyncState),
      inject: [PrismaService],
    },
    {
      provide: InMemoryRadiusReconciliationRecordRepository,
      useFactory: (prisma: PrismaService) => {
        const gateway = (prisma as any).radiusReconciliationRecord;
        if (!gateway) {
          return new InMemoryRadiusReconciliationRecordRepository();
        }

        return new PrismaRadiusReconciliationRecordRepository(gateway);
      },
      inject: [PrismaService],
    },
    {
      provide: RadiusAccountSyncService,
      useFactory: (
        adapter: InMemoryRadiusAccountAdapter,
        personRepository: InMemoryPersonRepository,
        externalAccountLinkRepository: InMemoryExternalAccountLinkRepository,
        reconciliationRecordRepository: InMemoryRadiusReconciliationRecordRepository,
        radiusSyncStateRepository: InMemoryRadiusSyncStateRepository,
        appConfig: AppConfig,
      ) =>
        new RadiusAccountSyncService(
          adapter,
          personRepository,
          externalAccountLinkRepository,
          reconciliationRecordRepository,
          radiusSyncStateRepository,
          appConfig,
        ),
      inject: [
        InMemoryRadiusAccountAdapter,
        InMemoryPersonRepository,
        InMemoryExternalAccountLinkRepository,
        InMemoryRadiusReconciliationRecordRepository,
        InMemoryRadiusSyncStateRepository,
        AppConfig,
      ],
    },
    {
      provide: RadiusStatusService,
      useFactory: (
        externalAccountLinkRepository: InMemoryExternalAccountLinkRepository,
        radiusSyncStateRepository: InMemoryRadiusSyncStateRepository,
        appConfig: AppConfig,
      ) =>
        new RadiusStatusService(
          externalAccountLinkRepository,
          radiusSyncStateRepository,
          appConfig,
        ),
      inject: [
        InMemoryExternalAccountLinkRepository,
        InMemoryRadiusSyncStateRepository,
        AppConfig,
      ],
    },
    {
      provide: RadiusReconciliationQueryService,
      useFactory: (
        reconciliationRecordRepository: InMemoryRadiusReconciliationRecordRepository,
        radiusSyncStateRepository: InMemoryRadiusSyncStateRepository,
      ) =>
        new RadiusReconciliationQueryService(
          reconciliationRecordRepository,
          radiusSyncStateRepository,
        ),
      inject: [
        InMemoryRadiusReconciliationRecordRepository,
        InMemoryRadiusSyncStateRepository,
      ],
    },
  ],
  exports: [
    InMemoryRadiusAccountAdapter,
    InMemoryExternalAccountLinkRepository,
    InMemoryRadiusReconciliationRecordRepository,
    InMemoryRadiusSyncStateRepository,
    RadiusAccountSyncService,
    RadiusReconciliationQueryService,
    RadiusStatusService,
  ],
})
export class RadiusModule {}
