import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { M365DirectoryReconciliationQueryService } from '../application/m365-directory-reconciliation-query.service';
import { M365DirectoryStatusDto } from '../contracts/m365-directory-status.contract';
import { M365DirectoryReconciliationReviewDto } from '../contracts/m365-directory-reconciliation.contract';
import { M365DirectorySyncResponseDto } from '../contracts/m365-directory-sync-response.contract';
import { M365DirectoryStatusService } from '../application/m365-directory-status.service';
import { M365DirectorySyncService } from '../application/m365-directory-sync.service';

@ApiTags('m365-directory')
@Controller('integrations/m365/directory')
export class M365DirectoryController {
  public constructor(
    private readonly m365DirectorySyncService: M365DirectorySyncService,
    private readonly m365DirectoryStatusService: M365DirectoryStatusService,
    private readonly m365DirectoryReconciliationQueryService: M365DirectoryReconciliationQueryService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  @Post('sync')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Trigger M365 directory synchronization' })
  @ApiOkResponse({ type: Object })
  public async syncDirectory(): Promise<M365DirectorySyncResponseDto> {
    const startedAt = new Date().toISOString();

    try {
      const result = await this.m365DirectorySyncService.syncDirectory();
      const finishedAt = new Date().toISOString();
      this.auditLogger?.record({
        actionType: 'integration.sync_run',
        actorId: null,
        category: 'integration',
        changeSummary: 'M365 directory sync completed.',
        details: {
          finishedAt,
          provider: 'm365',
          resourceType: 'directory',
          startedAt,
          status: 'SUCCEEDED',
        },
        metadata: {
          employeesCreated: result.employeesCreated,
          employeesLinked: result.employeesLinked,
          finishedAt,
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
        changeSummary: 'M365 directory sync failed.',
        details: {
          errorMessage: message,
          finishedAt,
          provider: 'm365',
          resourceType: 'directory',
          startedAt,
          status: 'FAILED',
        },
        metadata: {
          errorMessage: message,
          finishedAt,
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
}
