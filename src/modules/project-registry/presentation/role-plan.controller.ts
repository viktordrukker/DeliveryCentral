import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ProjectRolePlanService, UpsertRolePlanEntryDto } from '../application/project-role-plan.service';
import { GenerateStaffingRequestsFromPlanService } from '../application/generate-staffing-requests-from-plan.service';

@ApiTags('project-role-plan')
@Controller('projects')
export class ProjectRolePlanController {
  public constructor(
    private readonly rolePlanService: ProjectRolePlanService,
    private readonly generateService: GenerateStaffingRequestsFromPlanService,
  ) {}

  @Get(':id/role-plan')
  @ApiOperation({ summary: 'Get project role plan' })
  @ApiOkResponse({ description: 'Role plan entries.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getRolePlan(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.rolePlanService.getRolePlan(projectId);
  }

  @Post(':id/role-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update role plan entries' })
  @ApiOkResponse({ description: 'Updated role plan entries.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async upsertRolePlan(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() entries: UpsertRolePlanEntryDto[],
  ) {
    return this.rolePlanService.upsertRolePlan(projectId, entries);
  }

  @Delete(':id/role-plan/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role plan entry' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async deleteEntry(@Param('entryId', ParseUUIDPipe) entryId: string) {
    await this.rolePlanService.deleteRolePlanEntry(entryId);
  }

  @Get(':id/role-plan/comparison')
  @ApiOperation({ summary: 'Compare role plan vs actual staffing' })
  @ApiOkResponse({ description: 'Plan vs actual comparison.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getComparison(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.rolePlanService.getRolePlanVsActual(projectId);
  }

  @Get(':id/staffing-summary')
  @ApiOperation({ summary: 'Get project staffing summary' })
  @ApiOkResponse({ description: 'Staffing summary.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getStaffingSummary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.rolePlanService.getStaffingSummary(projectId);
  }

  @Post(':id/role-plan/generate-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate staffing requests from unfilled role plan entries' })
  @ApiOkResponse({ description: 'Generated request IDs.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async generateRequests(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? 'unknown';
    return this.generateService.execute(projectId, actorId);
  }
}
