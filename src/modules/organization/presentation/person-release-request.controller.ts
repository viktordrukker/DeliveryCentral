import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { Idempotent } from '@src/shared/http/idempotent.decorator';

import { DecidePersonReleaseService } from '../application/decide-person-release.service';
import { OpenPersonReleaseRequestService } from '../application/open-person-release-request.service';

interface PrincipalRequest {
  principal?: { personId?: string; userId?: string; roles?: string[] };
}

@ApiTags('people')
@Controller()
export class PersonReleaseRequestController {
  public constructor(
    private readonly openService: OpenPersonReleaseRequestService,
    private readonly decideService: DecidePersonReleaseService,
  ) {}

  @Post('org/people/:id/release-requests')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('resource_manager', 'hr_manager', 'director', 'admin')
  @Idempotent()
  @ApiOperation({
    summary:
      'HD-5 — open a release request for an active person. Status PENDING_APPROVAL until HR + Director both approve. Per J3.',
  })
  @ApiOkResponse({ description: 'New PersonReleaseRequest id.' })
  public async openReleaseRequest(
    @Param('id', ParseUUIDPipe) personId: string,
    @Body() body: { reason: string; reasonCode?: string; targetTerminationDate: string },
    @Req() req: PrincipalRequest,
  ): Promise<{ requestId: string }> {
    const actorId = req.principal?.personId ?? req.principal?.userId ?? 'unknown';
    return this.openService.execute({
      actorId,
      personId,
      reason: body.reason,
      reasonCode: body.reasonCode,
      targetTerminationDate: body.targetTerminationDate,
    });
  }

  @Post('people/release-requests/:requestId/approve')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('hr_manager', 'director', 'admin')
  @Idempotent()
  @ApiOperation({
    summary:
      'HD-5 — HR Manager OR Director approves a pending release request. Both must approve before the request can be finalized. Per J3.',
  })
  @ApiOkResponse({ description: 'Decision result.' })
  public async approveReleaseRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: { reason?: string } | undefined,
    @Req() req: PrincipalRequest,
  ): Promise<unknown> {
    const actorId = req.principal?.personId ?? req.principal?.userId ?? 'unknown';
    const decisionRole = pickDecisionRole(req.principal?.roles);
    return this.decideService.execute({
      actorId,
      decisionRole,
      requestId,
      decision: 'APPROVE',
      reason: body?.reason,
    });
  }

  @Post('people/release-requests/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('hr_manager', 'director', 'admin')
  @ApiOperation({
    summary:
      'HD-5 — HR Manager OR Director rejects a pending release request. Reason required. The first rejection short-circuits the workflow. Per J3.',
  })
  @ApiOkResponse({ description: 'Decision result.' })
  public async rejectReleaseRequest(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() body: { reason: string },
    @Req() req: PrincipalRequest,
  ): Promise<unknown> {
    const actorId = req.principal?.personId ?? req.principal?.userId ?? 'unknown';
    const decisionRole = pickDecisionRole(req.principal?.roles);
    return this.decideService.execute({
      actorId,
      decisionRole,
      requestId,
      decision: 'REJECT',
      reason: body?.reason,
    });
  }
}

/**
 * Resolve which approval slot the caller is filling. The dual-approval
 * workflow needs one approval per role (`hr_manager` and `director`).
 * Admins act in whichever role is still open — but to avoid auto-filling
 * both slots from a single admin call (which would defeat the dual-control
 * intent), admins MUST signal their role via `roles` claim ordering or
 * the controller refuses. The simple heuristic: prefer `hr_manager` then
 * `director`; if the caller has neither, throw 403.
 */
function pickDecisionRole(roles: string[] | undefined): 'hr_manager' | 'director' {
  if (!roles || roles.length === 0) {
    throw new ForbiddenException(
      'Decider must hold the hr_manager or director role; no roles found in principal.',
    );
  }
  if (roles.includes('hr_manager')) return 'hr_manager';
  if (roles.includes('director')) return 'director';
  if (roles.includes('admin')) {
    // Admin without a discriminating role — refuse explicitly so that
    // the dual-control invariant is preserved (admins must wear an
    // approver hat, not the wildcard hat, when deciding a release).
    throw new ForbiddenException(
      'Admin callers must additionally hold either hr_manager or director to decide a release. Dual-control: one role per slot.',
    );
  }
  throw new ForbiddenException('Decider must hold hr_manager or director role.');
}
