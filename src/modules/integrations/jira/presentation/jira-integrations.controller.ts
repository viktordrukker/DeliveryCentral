import { Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { JiraProjectSyncResponseDto } from '../contracts/jira-project-sync-response.contract';
import { JiraIntegrationStatusDto } from '../contracts/jira-integration-status.contract';
import { JiraProjectSyncService } from '../application/jira-project-sync.service';
import { JiraStatusService } from '../application/jira-status.service';
import { JiraSyncStatusStore } from '../application/jira-sync-status.store';

@ApiTags('jira-integrations')
@Controller('integrations/jira')
export class JiraIntegrationsController {
  public constructor(
    private readonly jiraProjectSyncService: JiraProjectSyncService,
    private readonly jiraStatusService: JiraStatusService,
    private readonly jiraSyncStatusStore: JiraSyncStatusStore,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  @Post('projects/sync')
  @ApiOperation({ summary: 'Trigger Jira project synchronization' })
  @ApiOkResponse({ type: JiraProjectSyncResponseDto, description: 'Jira project sync executed.' })
  public async syncProjects(): Promise<{
    projectsCreated: number;
    projectsUpdated: number;
    syncedProjectIds: string[];
  }> {
    const startedAt = new Date().toISOString();

    try {
      const result = await this.jiraProjectSyncService.syncProjects();
      const finishedAt = new Date().toISOString();
      this.jiraSyncStatusStore.recordSuccess(
        `Created ${result.projectsCreated}, updated ${result.projectsUpdated}.`,
      );
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary: 'Jira project sync completed successfully.',
        details: {
          finishedAt,
          provider: 'jira',
          resourceType: 'projects',
          startedAt,
          status: 'SUCCEEDED',
        },
        metadata: {
          finishedAt,
          projectsCreated: result.projectsCreated,
          projectsUpdated: result.projectsUpdated,
          provider: 'jira',
          resourceType: 'projects',
          startedAt,
          status: 'SUCCEEDED',
          syncedProjectIds: result.syncedProjectIds.map((item) => item.value),
        },
        targetEntityId: 'jira:projects',
        targetEntityType: 'INTEGRATION_SYNC',
      });

      return {
        projectsCreated: result.projectsCreated,
        projectsUpdated: result.projectsUpdated,
        syncedProjectIds: result.syncedProjectIds.map((item) => item.value),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Jira project sync failed.';
      const finishedAt = new Date().toISOString();
      this.jiraSyncStatusStore.recordFailure(message);
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary: 'Jira project sync failed.',
        details: {
          errorMessage: message,
          finishedAt,
          provider: 'jira',
          resourceType: 'projects',
          startedAt,
          status: 'FAILED',
        },
        metadata: {
          errorMessage: message,
          finishedAt,
          provider: 'jira',
          resourceType: 'projects',
          startedAt,
          status: 'FAILED',
        },
        targetEntityId: 'jira:projects',
        targetEntityType: 'INTEGRATION_SYNC',
      });
      await this.notificationEventTranslator?.integrationSyncFailed({
        errorMessage: message,
        provider: 'jira',
        resourceType: 'projects',
      });
      throw error;
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Jira integration status' })
  @ApiOkResponse({ description: 'Jira integration status.' })
  public getStatus(): JiraIntegrationStatusDto {
    return this.jiraStatusService.getStatus();
  }
}
