import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { HR_GOVERNANCE_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';

import { UnifiedApprovalQueueService } from '../application/unified-approval-queue.service';
import {
  ApprovalQueueResponseDto,
  ApprovalQueueSource,
} from '../application/contracts/approval-queue-item.dto';
import {
  UnifiedApprovalDecisionDto,
  UnifiedApprovalDecisionResponseDto,
} from '../application/contracts/unified-approval-decision.dto';

// HR governs leave + case approvals which surface in the unified queue, so
// HR must be able to enter /approvals alongside the staffing roles. The
// downstream per-source decision services own the finer-grained "HR can't
// approve a budget" RBAC checks via their own state machines.
const UNIFIED_APPROVAL_QUEUE_ROLES = Array.from(
  new Set([...STAFFING_ROLES, ...HR_GOVERNANCE_ROLES]),
);

@ApiTags('approvals')
@Controller('approvals')
export class UnifiedApprovalQueueController {
  public constructor(private readonly service: UnifiedApprovalQueueService) {}

  @Get('unified')
  @RequireRoles(...UNIFIED_APPROVAL_QUEUE_ROLES)
  @ApiOperation({
    summary:
      'FE-#264 — unified approval queue aggregating position-proposal / budget / ' +
      'activation / leave / case sources. SLA fields land when issue #257 ships.',
  })
  @ApiOkResponse({ type: Object })
  public async list(
    @Query(
      'source',
      new DefaultValuePipe([]),
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    sources: string[],
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe) pageSize: number,
  ): Promise<ApprovalQueueResponseDto> {
    return this.service.list({
      sources: sources as ApprovalQueueSource[],
      page,
      pageSize,
    });
  }

  @Post(':id/decision')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...UNIFIED_APPROVAL_QUEUE_ROLES)
  @ApiOperation({
    summary:
      'V2 Scope §4 — unified approve/reject endpoint. Routes by `source` to the ' +
      'per-source decision service so the FE has a single integration point.',
  })
  @ApiOkResponse({ type: UnifiedApprovalDecisionResponseDto })
  public async decide(
    @Param('id') id: string,
    @Body() body: UnifiedApprovalDecisionDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<UnifiedApprovalDecisionResponseDto> {
    const actorId = req.principal?.personId ?? req.principal?.userId;
    if (!actorId) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return this.service.decide({
      approvalId: id,
      source: body.source,
      decision: body.decision,
      actorId,
      actorRoles: req.principal?.roles ?? [],
      comment: body.comment,
      reason: body.reason,
    });
  }
}
