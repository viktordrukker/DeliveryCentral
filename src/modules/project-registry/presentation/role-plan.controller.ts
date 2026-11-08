import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PROJECT_DELIVERY_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { ProjectRolePlanService, UpsertRolePlanEntryDto } from '../application/project-role-plan.service';

@ApiTags('project-role-plan')
@Controller('projects')
export class ProjectRolePlanController {
  public constructor(
    private readonly rolePlanService: ProjectRolePlanService,
  ) {}

  @Get(':id/role-plan')
  @ApiOperation({ summary: 'Get project role plan' })
  @ApiOkResponse({ description: 'Role plan entries.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getRolePlan(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    // F-114 / D-103-write-path round 24 — actor-audit on the auto-initialized
    // entries when the plan is empty on first read.
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.rolePlanService.getRolePlan(projectId, actorId);
  }

  @Post(':id/role-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update role plan entries' })
  @ApiOkResponse({ description: 'Updated role plan entries.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async upsertRolePlan(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() entries: UpsertRolePlanEntryDto[],
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    // F-114 / D-103-write-path round 24 — actor-audit threaded into upsert.
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.rolePlanService.upsertRolePlan(projectId, entries, actorId);
  }

  @Delete(':id/role-plan/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role plan entry' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async deleteEntry(@Param('entryId', ParseUUIDPipe) entryId: string) {
    await this.rolePlanService.deleteRolePlanEntry(entryId);
  }

  @Get(':id/role-plan/comparison')
  @ApiOperation({ summary: 'Compare role plan vs actual staffing' })
  @ApiOkResponse({ description: 'Plan vs actual comparison.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getComparison(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.rolePlanService.getRolePlanVsActual(projectId);
  }

  @Get(':id/staffing-summary')
  @ApiOperation({ summary: 'Get project staffing summary' })
  @ApiOkResponse({ description: 'Staffing summary.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getStaffingSummary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.rolePlanService.getStaffingSummary(projectId);
  }
}
