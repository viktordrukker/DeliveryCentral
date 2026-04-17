import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { StaffingDeskService } from '../application/staffing-desk.service';
import { StaffingDeskQueryDto } from '../application/staffing-desk-query.dto';
import { StaffingDeskResponseDto } from '../application/staffing-desk-response.dto';
import { SupplyProfileService, SupplyProfileResponseDto } from '../application/supply-profile.service';
import { DemandProfileService, DemandProfileResponseDto } from '../application/demand-profile.service';
import { BenchManagementService, BenchDashboardResponseDto } from '../application/bench-management.service';
import { ProjectTimelineService, ProjectTimelineResponseDto } from '../application/project-timeline.service';
import { TeamBuilderService, TeamBuilderRequestDto, TeamBuilderResponseDto } from '../application/team-builder.service';

@ApiTags('staffing-desk')
@Controller('staffing-desk')
@RequireRoles('resource_manager', 'project_manager', 'delivery_manager', 'director', 'admin')
export class StaffingDeskController {
  public constructor(
    private readonly service: StaffingDeskService,
    private readonly supplyProfileService: SupplyProfileService,
    private readonly benchManagementService: BenchManagementService,
    private readonly demandProfileService: DemandProfileService,
    private readonly projectTimelineService: ProjectTimelineService,
    private readonly teamBuilderService: TeamBuilderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Unified staffing desk: assignments + staffing requests with composite filters' })
  @ApiQuery({ name: 'kind', required: false, description: 'assignment | request | all' })
  @ApiQuery({ name: 'person', required: false, description: 'Person name text search' })
  @ApiQuery({ name: 'personId', required: false })
  @ApiQuery({ name: 'project', required: false, description: 'Project name text search' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'poolId', required: false })
  @ApiQuery({ name: 'orgUnitId', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'Comma-separated statuses' })
  @ApiQuery({ name: 'priority', required: false, description: 'Comma-separated priorities' })
  @ApiQuery({ name: 'role', required: false, description: 'Staffing role text search' })
  @ApiQuery({ name: 'skills', required: false, description: 'Comma-separated skill names' })
  @ApiQuery({ name: 'from', required: false, description: 'Date range start (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Date range end (YYYY-MM-DD)' })
  @ApiQuery({ name: 'allocMin', required: false })
  @ApiQuery({ name: 'allocMax', required: false })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortDir', required: false, description: 'asc | desc' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiOkResponse({ description: 'Unified staffing desk response with KPIs and supply-demand metrics' })
  public async query(
    @Query() query: StaffingDeskQueryDto,
  ): Promise<StaffingDeskResponseDto> {
    return this.service.query(query);
  }

  @Get('supply-profile')
  @ApiOperation({ summary: 'Supply drill-down: available people by skill, grade, and capacity' })
  @ApiQuery({ name: 'poolId', required: false })
  @ApiQuery({ name: 'orgUnitId', required: false })
  @ApiOkResponse({ description: 'Supply profile with skill distribution and available people' })
  public async supplyProfile(
    @Query('poolId') poolId?: string,
    @Query('orgUnitId') orgUnitId?: string,
  ): Promise<SupplyProfileResponseDto> {
    return this.supplyProfileService.getProfile({ poolId, orgUnitId });
  }

  @Get('demand-profile')
  @ApiOperation({ summary: 'Demand drill-down: open requests by skill with gap analysis' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ description: 'Demand profile with skill gaps and request list' })
  public async demandProfile(
    @Query('projectId') projectId?: string,
  ): Promise<DemandProfileResponseDto> {
    return this.demandProfileService.getProfile({ projectId });
  }

  @Get('bench')
  @ApiOperation({ summary: 'Bench management dashboard: aging, distribution, roll-offs, demand matching' })
  @ApiQuery({ name: 'poolId', required: false })
  @ApiQuery({ name: 'orgUnitId', required: false })
  @ApiQuery({ name: 'weeks', required: false, description: 'Roll-off/trend horizon in weeks (default 12)' })
  @ApiOkResponse({ description: 'Bench dashboard with KPIs, aging, roster, distribution, roll-offs, trend' })
  public async benchDashboard(
    @Query('poolId') poolId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('weeks') weeks?: string,
  ): Promise<BenchDashboardResponseDto> {
    return this.benchManagementService.getDashboard({ poolId, orgUnitId, weeks: weeks ? Number(weeks) : 12 });
  }

  @Get('project-timeline')
  @ApiOperation({ summary: 'Project-centric timeline: projects × weeks with supply/demand per cell' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (Monday, YYYY-MM-DD)' })
  @ApiQuery({ name: 'weeks', required: false, description: 'Number of weeks (default 13)' })
  @ApiQuery({ name: 'poolId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiOkResponse({ description: 'Project timeline with assignment and request blocks per week' })
  public async projectTimeline(
    @Query('from') from: string,
    @Query('weeks') weeks?: string,
    @Query('poolId') poolId?: string,
    @Query('projectId') projectId?: string,
  ): Promise<ProjectTimelineResponseDto> {
    return this.projectTimelineService.getTimeline({
      from,
      weeks: weeks ? Number(weeks) : 13,
      poolId,
      projectId,
    });
  }

  @Post('team-builder')
  @ApiOperation({ summary: 'AI-assisted team builder: suggest optimal team for a project' })
  @ApiOkResponse({ description: 'Team composition suggestions with skill match scores' })
  public async teamBuilder(
    @Body() request: TeamBuilderRequestDto,
  ): Promise<TeamBuilderResponseDto> {
    return this.teamBuilderService.buildTeam(request);
  }
}
