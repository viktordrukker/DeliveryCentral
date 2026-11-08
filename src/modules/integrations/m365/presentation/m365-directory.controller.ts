import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { InMemoryM365DirectoryAdapter } from '../infrastructure/adapters/in-memory-m365-directory.adapter';
import { M365DirectoryReconciliationQueryService } from '../application/m365-directory-reconciliation-query.service';
import { M365DirectoryStatusDto } from '../contracts/m365-directory-status.contract';
import { M365DirectoryReconciliationReviewDto } from '../contracts/m365-directory-reconciliation.contract';
import { M365DirectorySyncResponseDto } from '../contracts/m365-directory-sync-response.contract';
import { M365TestConnectionResponseDto } from '../contracts/m365-test-connection-response.contract';
import { M365DirectoryStatusService } from '../application/m365-directory-status.service';
import { M365DirectorySyncService } from '../application/m365-directory-sync.service';

@ApiTags('m365-directory')
@Controller('integrations/m365/directory')
export class M365DirectoryController {
  public constructor(
    private readonly m365DirectorySyncService: M365DirectorySyncService,
    private readonly m365DirectoryStatusService: M365DirectoryStatusService,
    private readonly m365DirectoryReconciliationQueryService: M365DirectoryReconciliationQueryService,
    private readonly m365DirectoryAdapter: InMemoryM365DirectoryAdapter,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  @Post('sync')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Trigger M365 directory synchronization' })
  @ApiOkResponse({ type: Object })
  public async syncDirectory(): Promise<M365DirectorySyncResponseDto> {
    return this.runDirectorySync({ initiatedAs: 'manual' });
  }

  @Post('retry-sync')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Retry last M365 directory sync — replays the same end-to-end sync flow tagged as a retry.',
  })
  @ApiOkResponse({ type: Object, description: 'M365 directory retry sync executed.' })
  public async retrySync(): Promise<M365DirectorySyncResponseDto> {
    return this.runDirectorySync({ initiatedAs: 'retry' });
  }

  @Post('test-connection')
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Probe the M365 directory adapter reachability without mutating internal data — returns latency and any error.',
  })
  @ApiOkResponse({
    type: M365TestConnectionResponseDto,
    description: 'M365 directory connection probe result.',
  })
  public async testConnection(): Promise<M365TestConnectionResponseDto> {
    const startedAt = Date.now();
    try {
      await this.m365DirectoryAdapter.fetchUsers();
      const latencyMs = Date.now() - startedAt;
      this.auditLogger?.record({
        actionType: 'integration.test_connection',
        actorId: null,
        category: 'integration',
        changeSummary: 'M365 test connection succeeded.',
        details: {
          latencyMs,
          provider: 'm365',
          reachable: true,
        },
        metadata: {
          latencyMs,
          provider: 'm365',
          reachable: true,
          resourceType: 'connection',
        },
        targetEntityId: 'm365:connection',
        targetEntityType: 'INTEGRATION_PROBE',
      });
      return { reachable: true, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'M365 test connection failed.';
      this.auditLogger?.record({
        actionType: 'integration.test_connection',
        actorId: null,
        category: 'integration',
        changeSummary: 'M365 test connection failed.',
        details: {
          errorMessage: message,
          latencyMs,
          provider: 'm365',
          reachable: false,
        },
        metadata: {
          errorMessage: message,
          latencyMs,
          provider: 'm365',
          reachable: false,
          resourceType: 'connection',
        },
        targetEntityId: 'm365:connection',
        targetEntityType: 'INTEGRATION_PROBE',
      });
      return { reachable: false, latencyMs, errorMessage: message };
    }
  }

  @Get('status')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get M365 directory integration status' })
  @ApiOkResponse({ type: Object })
  public async getStatus(): Promise<M365DirectoryStatusDto> {
    return this.m365DirectoryStatusService.getStatus();
  }

  @Get('reconciliation')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Review M365 reconciliation outcomes' })
  @ApiOkResponse({ type: Object })
  public async getReconciliationReview(
    @Query('category')
    category?: 'AMBIGUOUS' | 'MATCHED' | 'STALE_CONFLICT' | 'UNMATCHED',
    @Query('query') query?: string,
  ): Promise<M365DirectoryReconciliationReviewDto> {
    return this.m365DirectoryReconciliationQueryService.getReview({
      category,
      query,
    });
  }

  private async runDirectorySync(opts: { initiatedAs: 'manual' | 'retry' }): Promise<M365DirectorySyncResponseDto> {
    const startedAt = new Date().toISOString();

    try {
      const result = await this.m365DirectorySyncService.syncDirectory();
      const finishedAt = new Date().toISOString();
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary:
          opts.initiatedAs === 'retry'
            ? 'M365 directory sync completed (retry).'
            : 'M365 directory sync completed.',
        details: {
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'm365',
          resourceType: 'directory',
          startedAt,
          status: 'SUCCEEDED',
        },
        metadata: {
          employeesCreated: result.employeesCreated,
          employeesLinked: result.employeesLinked,
          finishedAt,
          initiatedAs: opts.initiatedAs,
          managerMappingsResolved: result.managerMappingsResolved,
          provider: 'm365',
          resourceType: 'directory',
          startedAt,
          status: 'SUCCEEDED',
          syncedPersonIds: result.syncedPersonIds,
        },
        targetEntityId: 'm365:directory',
        targetEntityType: 'INTEGRATION_SYNC',
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'M365 directory sync failed.';
      const finishedAt = new Date().toISOString();
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary:
          opts.initiatedAs === 'retry'
            ? 'M365 directory sync failed (retry).'
            : 'M365 directory sync failed.',
        details: {
          errorMessage: message,
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'm365',
          resourceType: 'directory',
          startedAt,
          status: 'FAILED',
        },
        metadata: {
          errorMessage: message,
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'm365',
          resourceType: 'directory',
          startedAt,
          status: 'FAILED',
        },
        targetEntityId: 'm365:directory',
        targetEntityType: 'INTEGRATION_SYNC',
      });
      throw error;
    }
  }
}
