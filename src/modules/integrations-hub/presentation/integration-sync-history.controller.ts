import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { IntegrationSyncHistoryItemDto } from '../application/contracts/integration-sync-history.dto';
import { IntegrationSyncHistoryQueryService } from '../application/integration-sync-history-query.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationSyncHistoryController {
  public constructor(
    private readonly integrationSyncHistoryQueryService: IntegrationSyncHistoryQueryService,
  ) {}

  @Get('history')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List recent integration sync runs' })
  @ApiOkResponse({ type: Object })
  public listRecent(
    @Query('provider') provider?: 'jira' | 'm365' | 'radius',
    @Query('limit') limit?: string,
  ): IntegrationSyncHistoryItemDto[] {
    const parsedLimit = limit ? Number(limit) : undefined;

    return this.integrationSyncHistoryQueryService.listRecent({
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      provider,
    });
  }
}

