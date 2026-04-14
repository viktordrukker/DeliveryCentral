import { Module } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { OrganizationModule } from '../../organization/organization.module';
import { CreateEmployeeService } from '../../organization/application/create-employee.service';
import { InMemoryPersonRepository } from '../../organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { M365DirectoryReconciliationQueryService } from './application/m365-directory-reconciliation-query.service';
import { M365DirectoryStatusService } from './application/m365-directory-status.service';
import { M365DirectorySyncService } from './application/m365-directory-sync.service';
import { InMemoryM365DirectoryAdapter } from './infrastructure/adapters/in-memory-m365-directory.adapter';
import { InMemoryDirectorySyncStateRepository } from './infrastructure/repositories/in-memory/in-memory-directory-sync-state.repository';
import { InMemoryM365DirectoryReconciliationRecordRepository } from './infrastructure/repositories/in-memory/in-memory-m365-directory-reconciliation-record.repository';
import { InMemoryPersonExternalIdentityLinkRepository } from './infrastructure/repositories/in-memory/in-memory-person-external-identity-link.repository';
import { PrismaDirectorySyncStateRepository } from './infrastructure/repositories/prisma/prisma-directory-sync-state.repository';
import { PrismaM365DirectoryReconciliationRecordRepository } from './infrastructure/repositories/prisma/prisma-m365-directory-reconciliation-record.repository';
import { PrismaPersonExternalIdentityLinkRepository } from './infrastructure/repositories/prisma/prisma-person-external-identity-link.repository';
import { M365DirectoryController } from './presentation/m365-directory.controller';

@Module({
  imports: [OrganizationModule],
  controllers: [M365DirectoryController],
  providers: [
    {
      provide: InMemoryM365DirectoryAdapter,
      useValue: new InMemoryM365DirectoryAdapter(),
    },
    {
      provide: InMemoryPersonExternalIdentityLinkRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaPersonExternalIdentityLinkRepository(prisma.personExternalIdentityLink),
      inject: [PrismaService],
    },
    {
      provide: InMemoryDirectorySyncStateRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaDirectorySyncStateRepository(prisma.integrationSyncState),
      inject: [PrismaService],
    },
    {
      provide: InMemoryM365DirectoryReconciliationRecordRepository,
      useFactory: (prisma: PrismaService) => {
        const gateway = (prisma as any).m365DirectoryReconciliationRecord;
        if (!gateway) {
          return new InMemoryM365DirectoryReconciliationRecordRepository();
        }

        return new PrismaM365DirectoryReconciliationRecordRepository(gateway);
      },
      inject: [PrismaService],
    },
    {
      provide: M365DirectorySyncService,
      useFactory: (
        adapter: InMemoryM365DirectoryAdapter,
        personRepository: InMemoryPersonRepository,
        createEmployeeService: CreateEmployeeService,
        personExternalIdentityLinkRepository: InMemoryPersonExternalIdentityLinkRepository,
        reconciliationRecordRepository: InMemoryM365DirectoryReconciliationRecordRepository,
        directorySyncStateRepository: InMemoryDirectorySyncStateRepository,
        appConfig: AppConfig,
      ) =>
        new M365DirectorySyncService(
          adapter,
          personRepository,
          createEmployeeService,
          personExternalIdentityLinkRepository,
          reconciliationRecordRepository,
          directorySyncStateRepository,
          appConfig,
        ),
      inject: [
        InMemoryM365DirectoryAdapter,
        InMemoryPersonRepository,
        CreateEmployeeService,
        InMemoryPersonExternalIdentityLinkRepository,
        InMemoryM365DirectoryReconciliationRecordRepository,
        InMemoryDirectorySyncStateRepository,
        AppConfig,
      ],
    },
    {
      provide: M365DirectoryStatusService,
      useFactory: (
        personExternalIdentityLinkRepository: InMemoryPersonExternalIdentityLinkRepository,
        directorySyncStateRepository: InMemoryDirectorySyncStateRepository,
        appConfig: AppConfig,
      ) =>
        new M365DirectoryStatusService(
          personExternalIdentityLinkRepository,
          directorySyncStateRepository,
          appConfig,
        ),
      inject: [
        InMemoryPersonExternalIdentityLinkRepository,
        InMemoryDirectorySyncStateRepository,
        AppConfig,
      ],
    },
    {
      provide: M365DirectoryReconciliationQueryService,
      useFactory: (
        reconciliationRecordRepository: InMemoryM365DirectoryReconciliationRecordRepository,
        directorySyncStateRepository: InMemoryDirectorySyncStateRepository,
        prisma: PrismaService,
      ) =>
        new M365DirectoryReconciliationQueryService(
          reconciliationRecordRepository,
          directorySyncStateRepository,
          prisma,
        ),
      inject: [
        InMemoryM365DirectoryReconciliationRecordRepository,
        InMemoryDirectorySyncStateRepository,
        PrismaService,
      ],
    },
  ],
  exports: [
    InMemoryM365DirectoryAdapter,
    InMemoryPersonExternalIdentityLinkRepository,
    InMemoryDirectorySyncStateRepository,
    InMemoryM365DirectoryReconciliationRecordRepository,
    M365DirectorySyncService,
    M365DirectoryStatusService,
    M365DirectoryReconciliationQueryService,
  ],
})
export class M365Module {}
