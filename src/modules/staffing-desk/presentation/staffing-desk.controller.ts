import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
import { WorkforcePlannerService, WorkforcePlannerResponseDto, AutoMatchRequestDto, AutoMatchResultDto, PlannerApplyRequestDto, PlannerApplyResponseDto, ExtensionValidateRequestDto, ExtensionValidateResponseDto, WhyNotRequestDto, WhyNotResponseDto } from '../application/workforce-planner.service';
import { PlannerScenarioService, CreatePlannerScenarioDto, UpdatePlannerScenarioDto, PlannerScenarioDetailDto, PlannerScenarioSummaryDto } from '../application/planner-scenario.service';

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
    private readonly workforcePlannerService: WorkforcePlannerService,
    private readonly plannerScenarioService: PlannerScenarioService,
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

  @Get('planner')
  @ApiOperation({ summary: 'Workforce planner: project-centric simulation data with supply/demand/budget' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (Monday, YYYY-MM-DD)' })
  @ApiQuery({ name: 'weeks', required: false, description: 'Horizon in weeks (default 13)' })
  @ApiQuery({ name: 'includeDrafts', required: false, description: 'Include DRAFT projects (default false)' })
  @ApiQuery({ name: 'poolId', required: false })
  @ApiQuery({ name: 'orgUnitId', required: false })
  @ApiOkResponse({ description: 'Workforce planner response with projects, supply, demand, budget' })
  public async planner(
    @Query('from') from: string,
    @Query('weeks') weeks?: string,
    @Query('includeDrafts') includeDrafts?: string,
    @Query('poolId') poolId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('projectStatuses') projectStatuses?: string,
    @Query('priorities') priorities?: string,
  ): Promise<WorkforcePlannerResponseDto> {
    const parsedStatuses = projectStatuses ? (projectStatuses.split(',').filter(Boolean) as Array<'ACTIVE' | 'DRAFT' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED'>) : undefined;
    const parsedPriorities = priorities ? (priorities.split(',').filter(Boolean) as Array<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>) : undefined;
    return this.workforcePlannerService.getPlan({
      from,
      weeks: weeks ? Number(weeks) : 13,
      includeDrafts: includeDrafts === 'true',
      poolId,
      orgUnitId,
      projectStatuses: parsedStatuses,
      priorities: parsedPriorities,
    });
  }

  @Post('planner/auto-match')
  @ApiOperation({ summary: 'Auto-match bench to demand using strategy-driven scoring (BALANCED default)' })
  @ApiOkResponse({ description: 'Strategy, per-suggestion rationale, mismatch details, summary stats, unmatched demand' })
  public async autoMatch(@Body() request?: AutoMatchRequestDto): Promise<AutoMatchResultDto> {
    return this.workforcePlannerService.autoMatch(request ?? {});
  }

  @Post('planner/apply')
  @ApiOperation({ summary: 'Apply planning decisions: create assignments + staffing requests + extensions' })
  @ApiOkResponse({ description: 'Apply result with counts' })
  public async applyPlan(@Body() request: PlannerApplyRequestDto): Promise<PlannerApplyResponseDto> {
    return this.workforcePlannerService.applyPlan(request);
  }

  @Post('planner/extension-validate')
  @ApiOperation({ summary: 'Validate extending an existing assignment against employment, leave, project-end, and over-allocation constraints' })
  @ApiOkResponse({ description: 'Validation result with blocking errors and non-blocking anomalies' })
  public async validateExtension(@Body() request: ExtensionValidateRequestDto): Promise<ExtensionValidateResponseDto> {
    return this.workforcePlannerService.validateExtension(request);
  }

  @Post('planner/why-not')
  @ApiOperation({ summary: 'Explain why an unmatched demand was not filled: ranks closest candidates with per-candidate disqualifiers' })
  @ApiOkResponse({ description: 'Top-N close bench candidates with skill/availability/leave/employment reasoning' })
  public async whyNotFilled(@Body() request: WhyNotRequestDto): Promise<WhyNotResponseDto> {
    return this.workforcePlannerService.whyNot(request);
  }

  /* ── Planner Scenarios (server-persisted simulation snapshots) ── */

  @Get('planner/scenarios')
  @ApiOperation({ summary: 'List active planner scenarios with summary metrics' })
  public async listScenarios(): Promise<PlannerScenarioSummaryDto[]> {
    return this.plannerScenarioService.list();
  }

  @Get('planner/scenarios/:id')
  @ApiOperation({ summary: 'Load a scenario including its serialized simulation state' })
  public async getScenario(@Param('id') id: string): Promise<PlannerScenarioDetailDto> {
    return this.plannerScenarioService.get(id);
  }

  @Post('planner/scenarios')
  @ApiOperation({ summary: 'Save the current simulation state as a new scenario' })
  public async createScenario(@Body() dto: CreatePlannerScenarioDto): Promise<PlannerScenarioDetailDto> {
    return this.plannerScenarioService.create(dto);
  }

  @Patch('planner/scenarios/:id')
  @ApiOperation({ summary: 'Update an existing scenario (name, state, summary counts)' })
  public async updateScenario(@Param('id') id: string, @Body() dto: UpdatePlannerScenarioDto): Promise<PlannerScenarioDetailDto> {
    return this.plannerScenarioService.update(id, dto);
  }

  @Delete('planner/scenarios/:id')
  @ApiOperation({ summary: 'Archive a scenario (soft delete)' })
  public async archiveScenario(@Param('id') id: string): Promise<{ archived: boolean }> {
    return this.plannerScenarioService.archive(id);
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
