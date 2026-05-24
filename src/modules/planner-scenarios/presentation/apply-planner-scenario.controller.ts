import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { EXEC_ROLES } from '@src/shared/auth/role-presets';

import { ApplyPlannerScenarioService } from '../application/apply-planner-scenario.service';

@ApiTags('staffing')
@Controller('staffing/scenarios')
export class ApplyPlannerScenarioController {
  public constructor(private readonly service: ApplyPlannerScenarioService) {}

  @Post(':id/apply')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({
    summary:
      'FE-#269 — apply planner scenario transactionally. Writes proposed ' +
      'assignments into ProjectAssignment + AssignmentHistory inside a single ' +
      'prisma.$transaction. Any single failure rolls the whole batch back.',
  })
  @ApiOkResponse({ type: Object })
  public async apply(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<{ applied: number; scenarioId: string; errors: string[] }> {
    const actor = req.principal?.personId ?? req.principal?.userId;
    if (!actor) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return this.service.apply(id, actor);
  }
}
