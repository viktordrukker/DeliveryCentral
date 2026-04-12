import { Module } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { InMemoryExternalSyncStateRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-external-sync-state.repository';
import { InMemoryProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { ProjectRegistryModule } from '@src/modules/project-registry/project-registry.module';

import { JiraProjectSyncService } from './application/jira-project-sync.service';
import { JiraStatusService } from './application/jira-status.service';
import { JiraSyncStatusStore } from './application/jira-sync-status.store';
import { InMemoryJiraProjectAdapter } from './infrastructure/adapters/in-memory-jira-project.adapter';
import { InMemoryJiraWorkEvidenceAdapter } from './infrastructure/adapters/in-memory-jira-work-evidence.adapter';
import { JiraIntegrationsController } from './presentation/jira-integrations.controller';

@Module({
  imports: [NotificationsModule, ProjectRegistryModule],
  controllers: [JiraIntegrationsController],
  providers: [
    {
      provide: InMemoryJiraProjectAdapter,
      useValue: new InMemoryJiraProjectAdapter(),
    },
    {
      provide: InMemoryJiraWorkEvidenceAdapter,
      useValue: new InMemoryJiraWorkEvidenceAdapter(),
    },
    JiraSyncStatusStore,
    {
      provide: JiraProjectSyncService,
      useFactory: (
        adapter: InMemoryJiraProjectAdapter,
        projectRepository: InMemoryProjectRepository,
        linkRepository: InMemoryProjectExternalLinkRepository,
        syncStateRepository: InMemoryExternalSyncStateRepository,
      ) =>
        new JiraProjectSyncService(
          adapter,
          projectRepository,
          linkRepository,
          syncStateRepository,
        ),
      inject: [
        InMemoryJiraProjectAdapter,
        InMemoryProjectRepository,
        InMemoryProjectExternalLinkRepository,
        InMemoryExternalSyncStateRepository,
      ],
    },
    {
      provide: JiraStatusService,
      useFactory: (
        statusStore: JiraSyncStatusStore,
        workEvidenceAdapter: InMemoryJiraWorkEvidenceAdapter,
      ) => new JiraStatusService(statusStore, workEvidenceAdapter),
      inject: [JiraSyncStatusStore, InMemoryJiraWorkEvidenceAdapter],
    },
    AuditLoggerService,
  ],
  exports: [
    JiraProjectSyncService,
    JiraStatusService,
    JiraSyncStatusStore,
    InMemoryJiraProjectAdapter,
  ],
})
export class JiraModule {}
