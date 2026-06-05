import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_MANAGER_ROLES } from '@src/shared/auth/role-presets';

import {
  UnifiedCandidateQueueResult,
  UnifiedCandidateQueueService,
} from '../application/unified-candidate-queue.service';

/**
 * LEAN-P4c-2 — REST surface for the unified candidate queue.
 *
 * RM/PM/DM/director/admin see every `ProjectPositionCandidate` whose parent
 * position is `OPEN` or `PROPOSED`, sorted by oldest-proposed-first so the
 * FIFO queue is the natural work-order. Paginated to cap response size.
 */
@ApiTags('staffing')
@Controller('staffing/candidates')
export class ProposalsController {
  public constructor(private readonly queueService: UnifiedCandidateQueueService) {}

  @Get('queue')
  @RequireRoles(...ALL_MANAGER_ROLES)
  @ApiOperation({
    summary:
      'LEAN-P4c-2 — unified candidate queue across all OPEN/PROPOSED positions, oldest-first.',
  })
  @ApiOkResponse({ type: Object })
  public async queue(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<UnifiedCandidateQueueResult> {
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    const parsedPageSize = pageSize ? Number.parseInt(pageSize, 10) : undefined;
    return this.queueService.list({
      page: Number.isFinite(parsedPage) ? parsedPage : undefined,
      pageSize: Number.isFinite(parsedPageSize) ? parsedPageSize : undefined,
    });
  }
}
