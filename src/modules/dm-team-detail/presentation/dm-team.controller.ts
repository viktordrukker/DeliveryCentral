import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { DELIVERY_EXEC_ROLES } from '@src/shared/auth/role-presets';

import type { TeamConflictsResponse } from '../application/contracts/team-conflict.dto';
import { TeamConflictsService } from '../application/team-conflicts.service';

interface RequestWithPrincipal extends Request {
  principal?: RequestPrincipal;
}

@ApiTags('dm-team')
@Controller('dm-team')
export class DmTeamController {
  public constructor(private readonly teamConflictsService: TeamConflictsService) {}

  @Get('conflicts')
  @ApiOperation({
    summary:
      'LEAN-P4-missing-8 — overallocation conflicts across the DM portfolio in a 4-week rolling window.',
  })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ description: 'Conflict rows grouped by (person, weekStart).' })
  @RequireRoles(...DELIVERY_EXEC_ROLES)
  public async conflicts(
    @Req() request: RequestWithPrincipal,
    @Query('asOf') asOf?: string,
  ): Promise<TeamConflictsResponse> {
    const principalPersonId = request.principal?.personId;
    if (!principalPersonId) {
      throw new BadRequestException('Principal personId is required.');
    }
    const asOfDate = asOf ? new Date(asOf) : new Date();
    if (Number.isNaN(asOfDate.getTime())) {
      throw new BadRequestException('asOf is not a valid date.');
    }
    return this.teamConflictsService.execute({
      deliveryManagerPersonId: principalPersonId,
      asOf: asOfDate,
    });
  }
}
