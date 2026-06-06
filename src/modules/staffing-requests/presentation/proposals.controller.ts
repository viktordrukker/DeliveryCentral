import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_MANAGER_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';

import {
  AutoMatchCandidatesService,
  AutoMatchResult,
} from '../application/auto-match-candidates.service';
import {
  UnifiedCandidateQueueResult,
  UnifiedCandidateQueueService,
} from '../application/unified-candidate-queue.service';

interface RequestWithPrincipal extends Request {
  principal?: RequestPrincipal;
}

/**
 * Permissive UUID-shape regex (matches v1-v5 + seed pseudo-UUIDs). Used in
 * place of `@IsUUID()` per the v2 DTO contract — seed data emits stable
 * deterministic pseudo-UUIDs (e.g. `00000000-0000-0000-0000-...`) that the
 * stricter validator rejects.
 */
const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * LEAN-P4-missing-3 — AutoMatch request body. `topN` is optional; defaults to
 * 5 on the service when omitted. UUID-shape validation uses the permissive
 * `@Matches` regex (matches seed pseudo-UUIDs).
 */
class AutoMatchRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  public topN?: number;
}

/**
 * LEAN-P4c-2 — REST surface for the unified candidate queue.
 *
 * RM/PM/DM/director/admin see every `ProjectPositionCandidate` whose parent
 * position is `OPEN` or `PROPOSED`, sorted by oldest-proposed-first so the
 * FIFO queue is the natural work-order. Paginated to cap response size.
 *
 * LEAN-P4-missing-3 — adds POST /staffing/positions/:id/auto-match for the RM
 * "Auto-match by skill" action; populates the candidate slate with the top-N
 * available skill-matched people so the RM can review + adjust before
 * transitioning the position to PROPOSED.
 */
@ApiTags('staffing')
@Controller('staffing')
export class ProposalsController {
  public constructor(
    private readonly queueService: UnifiedCandidateQueueService,
    private readonly autoMatchService: AutoMatchCandidatesService,
  ) {}

  @Get('candidates/queue')
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

  @Post('positions/:id/auto-match')
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({
    summary:
      'LEAN-P4-missing-3 — auto-populate a position\'s candidate slate with top-N skill-matched + available people.',
  })
  @ApiCreatedResponse({ type: Object })
  public async autoMatch(
    @Param('id') id: string,
    @Body() body: AutoMatchRequestDto,
    @Req() request: RequestWithPrincipal,
  ): Promise<AutoMatchResult> {
    if (!UUID_SHAPE.test(id)) {
      throw new BadRequestException('id must be a UUID-shaped string');
    }
    const actorId = request.principal?.personId ?? request.principal?.userId ?? null;
    return this.autoMatchService.execute({
      actorId,
      positionId: id,
      topN: body.topN,
    });
  }
}
