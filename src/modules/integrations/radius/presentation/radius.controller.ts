import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { RadiusAccountSyncService } from '../application/radius-account-sync.service';
import { RadiusReconciliationQueryService } from '../application/radius-reconciliation-query.service';
import { RadiusStatusService } from '../application/radius-status.service';
import { RadiusReconciliationReviewDto } from '../contracts/radius-reconciliation.contract';
import { RadiusStatusDto } from '../contracts/radius-status.contract';
import { RadiusSyncResponseDto } from '../contracts/radius-sync-response.contract';

@ApiTags('radius')
@Controller('integrations/radius')
export class RadiusController {
  public constructor(
    private readonly radiusAccountSyncService: RadiusAccountSyncService,
    private readonly radiusStatusService: RadiusStatusService,
    private readonly radiusReconciliationQueryService: RadiusReconciliationQueryService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  @Post('accounts/sync')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Trigger RADIUS account presence synchronization' })
  @ApiOkResponse({ type: Object })
  public async syncAccounts(): Promise<RadiusSyncResponseDto> {
    const startedAt = new Date().toISOString();

    try {
      const result = await this.radiusAccountSyncService.syncAccounts();
      const finishedAt = new Date().toISOString();
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary: 'RADIUS account sync completed.',
        details: {
          finishedAt,
          provider: 'radius',
          resourceType: 'accounts',
          startedAt,
          status: 'SUCCEEDED',
        },
        metadata: {
          accountsImported: result.accountsImported,
          accountsLinked: result.accountsLinked,
          finishedAt,
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
        changeSummary: 'RADIUS account sync failed.',
        details: {
          errorMessage: message,
          finishedAt,
          provider: 'radius',
          resourceType: 'accounts',
          startedAt,
          status: 'FAILED',
        },
        metadata: {
          errorMessage: message,
          finishedAt,
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
}
