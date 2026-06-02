import { Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { JiraProjectSyncResponseDto } from '../contracts/jira-project-sync-response.contract';
import { JiraIntegrationStatusDto } from '../contracts/jira-integration-status.contract';
import { JiraTestConnectionResponseDto } from '../contracts/jira-test-connection-response.contract';
import { JiraProjectSyncService } from '../application/jira-project-sync.service';
import { JiraStatusService } from '../application/jira-status.service';
import { JiraSyncStatusStore } from '../application/jira-sync-status.store';
import { InMemoryJiraProjectAdapter } from '../infrastructure/adapters/in-memory-jira-project.adapter';

@ApiTags('jira-integrations')
@Controller('integrations/jira')
export class JiraIntegrationsController {
  public constructor(
    private readonly jiraProjectSyncService: JiraProjectSyncService,
    private readonly jiraStatusService: JiraStatusService,
    private readonly jiraSyncStatusStore: JiraSyncStatusStore,
    private readonly jiraProjectAdapter: InMemoryJiraProjectAdapter,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  @Post('projects/sync')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Trigger Jira project synchronization' })
  @ApiOkResponse({ type: JiraProjectSyncResponseDto, description: 'Jira project sync executed.' })
  public async syncProjects(): Promise<{
    projectsCreated: number;
    projectsUpdated: number;
    syncedProjectIds: string[];
  }> {
    return this.runProjectSync({ initiatedAs: 'manual' });
  }

  @Post('retry-sync')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Retry last Jira project sync — replays the same end-to-end sync flow tagged as a retry.',
  })
  @ApiOkResponse({ type: JiraProjectSyncResponseDto, description: 'Jira project retry sync executed.' })
  public async retrySync(): Promise<{
    projectsCreated: number;
    projectsUpdated: number;
    syncedProjectIds: string[];
  }> {
    return this.runProjectSync({ initiatedAs: 'retry' });
  }

  @Post('reset-sync')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Reset Jira sync state — clears last-run snapshot from the status store.',
  })
  @ApiOkResponse({ description: 'Jira sync state reset.' })
  public resetSync(): { reset: true } {
    const previousSnapshot = this.jiraSyncStatusStore.getSnapshot();
    this.jiraSyncStatusStore.reset();
    this.auditLogger?.record({
      actionType: 'integration.sync_reset',
      actorId: null,
      category: 'integration',
      changeSummary: 'Jira sync state reset by admin.',
      details: {
        previousLastProjectSyncAt: previousSnapshot.lastProjectSyncAt?.toISOString(),
        previousLastProjectSyncOutcome: previousSnapshot.lastProjectSyncOutcome,
        provider: 'jira',
      },
      metadata: {
        previousLastProjectSyncAt: previousSnapshot.lastProjectSyncAt?.toISOString(),
        previousLastProjectSyncOutcome: previousSnapshot.lastProjectSyncOutcome,
        provider: 'jira',
        resourceType: 'projects',
      },
      targetEntityId: 'jira:projects',
      targetEntityType: 'INTEGRATION_SYNC',
    });
    return { reset: true };
  }

  @Post('test-connection')
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Probe the Jira adapter reachability without mutating internal projects — returns latency and any error.',
  })
  @ApiOkResponse({
    type: JiraTestConnectionResponseDto,
    description: 'Jira connection probe result.',
  })
  public async testConnection(): Promise<JiraTestConnectionResponseDto> {
    const startedAt = Date.now();
    try {
      await this.jiraProjectAdapter.fetchProjects();
      const latencyMs = Date.now() - startedAt;
      this.auditLogger?.record({
        actionType: 'integration.test_connection',
        actorId: null,
        category: 'integration',
        changeSummary: 'Jira test connection succeeded.',
        details: {
          latencyMs,
          provider: 'jira',
          reachable: true,
        },
        metadata: {
          latencyMs,
          provider: 'jira',
          reachable: true,
          resourceType: 'connection',
        },
        targetEntityId: 'jira:connection',
        targetEntityType: 'INTEGRATION_PROBE',
      });
      return { reachable: true, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Jira test connection failed.';
      this.auditLogger?.record({
        actionType: 'integration.test_connection',
        actorId: null,
        category: 'integration',
        changeSummary: 'Jira test connection failed.',
        details: {
          errorMessage: message,
          latencyMs,
          provider: 'jira',
          reachable: false,
        },
        metadata: {
          errorMessage: message,
          latencyMs,
          provider: 'jira',
          reachable: false,
          resourceType: 'connection',
        },
        targetEntityId: 'jira:connection',
        targetEntityType: 'INTEGRATION_PROBE',
      });
      return { reachable: false, latencyMs, errorMessage: message };
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Jira integration status' })
  @ApiOkResponse({ description: 'Jira integration status.' })
  public getStatus(): JiraIntegrationStatusDto {
    return this.jiraStatusService.getStatus();
  }

  private async runProjectSync(opts: { initiatedAs: 'manual' | 'retry' }): Promise<{
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
        changeSummary:
          opts.initiatedAs === 'retry'
            ? 'Jira project sync completed successfully (retry).'
            : 'Jira project sync completed successfully.',
        details: {
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'jira',
          resourceType: 'projects',
          startedAt,
          status: 'SUCCEEDED',
        },
        metadata: {
          finishedAt,
          initiatedAs: opts.initiatedAs,
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
        changeSummary:
          opts.initiatedAs === 'retry'
            ? 'Jira project sync failed (retry).'
            : 'Jira project sync failed.',
        details: {
          errorMessage: message,
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'jira',
          resourceType: 'projects',
          startedAt,
          status: 'FAILED',
        },
        metadata: {
          errorMessage: message,
          finishedAt,
          initiatedAs: opts.initiatedAs,
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
}
