import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { InMemoryRadiusAccountAdapter } from '../infrastructure/adapters/in-memory-radius-account.adapter';
import { RadiusAccountSyncService } from '../application/radius-account-sync.service';
import { RadiusReconciliationQueryService } from '../application/radius-reconciliation-query.service';
import { RadiusStatusService } from '../application/radius-status.service';
import { RadiusReconciliationReviewDto } from '../contracts/radius-reconciliation.contract';
import { RadiusStatusDto } from '../contracts/radius-status.contract';
import { RadiusSyncResponseDto } from '../contracts/radius-sync-response.contract';
import { RadiusTestConnectionResponseDto } from '../contracts/radius-test-connection-response.contract';

@ApiTags('radius')
@Controller('integrations/radius')
export class RadiusController {
  public constructor(
    private readonly radiusAccountSyncService: RadiusAccountSyncService,
    private readonly radiusStatusService: RadiusStatusService,
    private readonly radiusReconciliationQueryService: RadiusReconciliationQueryService,
    private readonly radiusAccountAdapter: InMemoryRadiusAccountAdapter,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  @Post('accounts/sync')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Trigger RADIUS account presence synchronization' })
  @ApiOkResponse({ type: Object })
  public async syncAccounts(): Promise<RadiusSyncResponseDto> {
    return this.runAccountSync({ initiatedAs: 'manual' });
  }

  @Post('retry-sync')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Retry last RADIUS account sync — replays the same end-to-end sync flow tagged as a retry.',
  })
  @ApiOkResponse({ type: Object, description: 'RADIUS account retry sync executed.' })
  public async retrySync(): Promise<RadiusSyncResponseDto> {
    return this.runAccountSync({ initiatedAs: 'retry' });
  }

  @Post('test-connection')
  @RequireRoles('admin')
  @ApiOperation({
    summary:
      'Probe the RADIUS account adapter reachability without mutating internal data — returns latency and any error.',
  })
  @ApiOkResponse({
    type: RadiusTestConnectionResponseDto,
    description: 'RADIUS connection probe result.',
  })
  public async testConnection(): Promise<RadiusTestConnectionResponseDto> {
    const startedAt = Date.now();
    try {
      await this.radiusAccountAdapter.fetchAccounts();
      const latencyMs = Date.now() - startedAt;
      this.auditLogger?.record({
        actionType: 'integration.test_connection',
        actorId: null,
        category: 'integration',
        changeSummary: 'RADIUS test connection succeeded.',
        details: {
          latencyMs,
          provider: 'radius',
          reachable: true,
        },
        metadata: {
          latencyMs,
          provider: 'radius',
          reachable: true,
          resourceType: 'connection',
        },
        targetEntityId: 'radius:connection',
        targetEntityType: 'INTEGRATION_PROBE',
      });
      return { reachable: true, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'RADIUS test connection failed.';
      this.auditLogger?.record({
        actionType: 'integration.test_connection',
        actorId: null,
        category: 'integration',
        changeSummary: 'RADIUS test connection failed.',
        details: {
          errorMessage: message,
          latencyMs,
          provider: 'radius',
          reachable: false,
        },
        metadata: {
          errorMessage: message,
          latencyMs,
          provider: 'radius',
          reachable: false,
          resourceType: 'connection',
        },
        targetEntityId: 'radius:connection',
        targetEntityType: 'INTEGRATION_PROBE',
      });
      return { reachable: false, latencyMs, errorMessage: message };
    }
  }

  @Get('status')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get RADIUS account sync status' })
  @ApiOkResponse({ type: Object })
  public async getStatus(): Promise<RadiusStatusDto> {
    return this.radiusStatusService.getStatus();
  }

  @Get('reconciliation')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Review RADIUS account reconciliation outcomes' })
  @ApiOkResponse({ type: Object })
  public async getReconciliationReview(
    @Query('category')
    category?: 'AMBIGUOUS' | 'MATCHED' | 'PRESENCE_DRIFT' | 'UNMATCHED',
    @Query('query') query?: string,
  ): Promise<RadiusReconciliationReviewDto> {
    return this.radiusReconciliationQueryService.getReview({
      category,
      query,
    });
  }

  private async runAccountSync(opts: { initiatedAs: 'manual' | 'retry' }): Promise<RadiusSyncResponseDto> {
    const startedAt = new Date().toISOString();

    try {
      const result = await this.radiusAccountSyncService.syncAccounts();
      const finishedAt = new Date().toISOString();
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary:
          opts.initiatedAs === 'retry'
            ? 'RADIUS account sync completed (retry).'
            : 'RADIUS account sync completed.',
        details: {
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'radius',
          resourceType: 'accounts',
          startedAt,
          status: 'SUCCEEDED',
        },
        metadata: {
          accountsImported: result.accountsImported,
          accountsLinked: result.accountsLinked,
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'radius',
          resourceType: 'accounts',
          startedAt,
          status: 'SUCCEEDED',
          syncedAccountIds: result.syncedAccountIds,
          unmatchedAccounts: result.unmatchedAccounts,
        },
        targetEntityId: 'radius:accounts',
        targetEntityType: 'INTEGRATION_SYNC',
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'RADIUS account sync failed.';
      const finishedAt = new Date().toISOString();
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary:
          opts.initiatedAs === 'retry'
            ? 'RADIUS account sync failed (retry).'
            : 'RADIUS account sync failed.',
        details: {
          errorMessage: message,
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'radius',
          resourceType: 'accounts',
          startedAt,
          status: 'FAILED',
        },
        metadata: {
          errorMessage: message,
          finishedAt,
          initiatedAs: opts.initiatedAs,
          provider: 'radius',
          resourceType: 'accounts',
          startedAt,
          status: 'FAILED',
        },
        targetEntityId: 'radius:accounts',
        targetEntityType: 'INTEGRATION_SYNC',
      });
      throw error;
    }
  }
}
