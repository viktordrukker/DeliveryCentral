import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AllowSelfScope } from '@src/modules/identity-access/application/self-scope.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ALL_AUTHENTICATED_ROLES, ALL_MANAGER_ROLES, DELIVERY_EXEC_ROLES, EXEC_ROLES, HR_GOVERNANCE_ROLES, RM_EXEC_ROLES } from '@src/shared/auth/role-presets';
import { DeliveryManagerDashboardQueryService } from '../application/delivery-manager-dashboard-query.service';
import { DeliveryManagerDashboardResponseDto, ProjectScorecardHistoryItemDto } from '../application/contracts/delivery-manager-dashboard.dto';
import { DirectorDashboardQueryService } from '../application/director-dashboard-query.service';
import { DirectorDashboardResponseDto } from '../application/contracts/director-dashboard.dto';
import { DirectorSlaSummaryQueryService } from '../application/director-sla-summary-query.service';
import { DirectorSlaSummaryDto } from '../application/contracts/director-sla-summary.dto';
import { EmployeeDashboardQueryService } from '../application/employee-dashboard-query.service';
import { EmployeeDashboardResponseDto } from '../application/contracts/employee-dashboard.dto';
import { HeadcountTrendPointDto, HeadcountTrendQueryDto } from '../application/contracts/headcount-trend.dto';
import { HeadcountTrendService } from '../application/headcount-trend.service';
import { HrManagerDashboardResponseDto } from '../application/contracts/hr-manager-dashboard.dto';
import { ProjectManagerDashboardResponseDto } from '../application/contracts/project-manager-dashboard.dto';
import { HrManagerDashboardQueryService } from '../application/hr-manager-dashboard-query.service';
import { PendingActionsQueryService } from '../application/pending-actions-query.service';
import { PendingActionsResponseDto } from '../application/contracts/pending-actions.dto';
import { ProjectManagerDashboardQueryService } from '../application/project-manager-dashboard-query.service';
import { ResourceManagerDashboardResponseDto } from '../application/contracts/resource-manager-dashboard.dto';
import { ResourceManagerDashboardQueryService } from '../application/resource-manager-dashboard-query.service';
import { RoleDashboardQueryService } from '../application/role-dashboard-query.service';
import { RoleDashboardResponseDto } from '../application/contracts/role-dashboard.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class RoleDashboardController {
  public constructor(
    private readonly roleDashboardQueryService: RoleDashboardQueryService,
    private readonly deliveryManagerDashboardQueryService: DeliveryManagerDashboardQueryService,
    private readonly directorDashboardQueryService: DirectorDashboardQueryService,
    private readonly employeeDashboardQueryService: EmployeeDashboardQueryService,
    private readonly projectManagerDashboardQueryService: ProjectManagerDashboardQueryService,
    private readonly resourceManagerDashboardQueryService: ResourceManagerDashboardQueryService,
    private readonly hrManagerDashboardQueryService: HrManagerDashboardQueryService,
    private readonly pendingActionsQueryService: PendingActionsQueryService,
    private readonly directorSlaSummaryQueryService: DirectorSlaSummaryQueryService,
    private readonly headcountTrendService: HeadcountTrendService,
  ) {}

  @Get('employee/:personId')
  @RequireRoles('hr_manager', 'director', 'delivery_manager', 'admin')
  @AllowSelfScope({ param: 'personId' })
  @ApiOperation({ summary: 'Get self-oriented dashboard data for one employee' })
  @ApiParam({ name: 'personId', type: String })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: EmployeeDashboardResponseDto })
  public async getEmployeeDashboard(
    @Param('personId') personId: string,
    @Query('asOf') asOf?: string,
  ): Promise<EmployeeDashboardResponseDto> {
    try {
      return await this.employeeDashboardQueryService.execute({ asOf, personId });
    } catch (error) {
      if (error instanceof Error && error.message === 'Employee dashboard person was not found.') {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Employee dashboard query failed.',
      );
    }
  }

  @Get('project-manager/:personId')
  @RequireRoles('project_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get project-oriented dashboard data for one project manager' })
  @ApiParam({ name: 'personId', type: String })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: ProjectManagerDashboardResponseDto })
  public async getProjectManagerDashboard(
    @Param('personId') personId: string,
    @Query('asOf') asOf?: string,
  ): Promise<ProjectManagerDashboardResponseDto> {
    try {
      return await this.projectManagerDashboardQueryService.execute({ asOf, personId });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Project manager dashboard person was not found.'
      ) {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Project manager dashboard query failed.',
      );
    }
  }

  @Get('resource-manager/:personId')
  @RequireRoles(...RM_EXEC_ROLES)
  @ApiOperation({ summary: 'Get capacity-oriented dashboard data for one resource manager' })
  @ApiParam({ name: 'personId', type: String })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: ResourceManagerDashboardResponseDto })
  public async getResourceManagerDashboard(
    @Param('personId') personId: string,
    @Query('asOf') asOf?: string,
  ): Promise<ResourceManagerDashboardResponseDto> {
    try {
      return await this.resourceManagerDashboardQueryService.execute({ asOf, personId });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Resource manager dashboard person was not found.'
      ) {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Resource manager dashboard query failed.',
      );
    }
  }

  @Get('hr-manager/:personId')
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  @ApiOperation({ summary: 'Get organization-centric dashboard data for one HR manager' })
  @ApiParam({ name: 'personId', type: String })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: HrManagerDashboardResponseDto })
  public async getHrManagerDashboard(
    @Param('personId') personId: string,
    @Query('asOf') asOf?: string,
  ): Promise<HrManagerDashboardResponseDto> {
    try {
      return await this.hrManagerDashboardQueryService.execute({ asOf, personId });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'HR manager dashboard person was not found.'
      ) {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'HR manager dashboard query failed.',
      );
    }
  }

  @Get('delivery-manager')
  @RequireRoles(...DELIVERY_EXEC_ROLES)
  @ApiOperation({ summary: 'Get cross-portfolio delivery health dashboard' })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: DeliveryManagerDashboardResponseDto })
  public async getDeliveryManagerDashboard(
    @Query('asOf') asOf?: string,
  ): Promise<DeliveryManagerDashboardResponseDto> {
    try {
      return await this.deliveryManagerDashboardQueryService.execute({ asOf });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Delivery manager dashboard query failed.',
      );
    }
  }

  @Get('delivery/scorecard-history')
  @RequireRoles(...DELIVERY_EXEC_ROLES)
  @ApiOperation({ summary: 'Get project health scorecard history (trailing N weeks)' })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: [ProjectScorecardHistoryItemDto] })
  public async getScorecardHistory(
    @Query('projectId') projectId?: string,
    @Query('weeks') weeksRaw?: string,
    @Query('asOf') asOf?: string,
  ): Promise<ProjectScorecardHistoryItemDto[]> {
    const weeks = weeksRaw ? parseInt(weeksRaw, 10) : undefined;
    try {
      return await this.deliveryManagerDashboardQueryService.getScorecardHistory({
        asOf,
        projectId,
        weeks,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Scorecard history query failed.',
      );
    }
  }

  @Get('director')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({ summary: 'Get organisation-wide executive summary dashboard' })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: DirectorDashboardResponseDto })
  public async getDirectorDashboard(
    @Query('asOf') asOf?: string,
  ): Promise<DirectorDashboardResponseDto> {
    try {
      return await this.directorDashboardQueryService.execute({ asOf });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Director dashboard query failed.',
      );
    }
  }

  @Get('exec/sla-summary')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({
    summary:
      'F-3.3 / WO-4.15/5.6 — Director exec dashboard SLA tile + Time-to-fill sparkline metrics.',
  })
  @ApiOkResponse({ type: DirectorSlaSummaryDto })
  public async getExecSlaSummary(): Promise<DirectorSlaSummaryDto> {
    try {
      return await this.directorSlaSummaryQueryService.execute();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Director SLA summary query failed.',
      );
    }
  }

  @Get('pending-actions')
  @RequireRoles(...ALL_MANAGER_ROLES)
  @ApiOperation({
    summary:
      'F-3.2 / WO-4.14 — unified pending-approvals queue for managers (SR pick + budget-change + leave + timesheet).',
  })
  @ApiQuery({ name: 'personId', required: false, type: String })
  @ApiOkResponse({ type: PendingActionsResponseDto })
  public async getPendingActions(
    @Req() req: { principal?: { personId?: string; roles?: string[] } },
    @Query('personId') personIdOverride?: string,
  ): Promise<PendingActionsResponseDto> {
    const roles = req.principal?.roles ?? [];
    const principalPersonId = req.principal?.personId;
    // Admins can scope to any person; everyone else queries themselves.
    const targetPersonId =
      roles.includes('admin') && personIdOverride ? personIdOverride : principalPersonId;
    if (!targetPersonId) {
      throw new BadRequestException('Authenticated principal required.');
    }
    try {
      return await this.pendingActionsQueryService.execute(targetPersonId);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Pending actions query failed.',
      );
    }
  }

  @Get('headcount/trend')
  @RequireRoles(...HR_GOVERNANCE_ROLES)
  @ApiOperation({
    summary: 'W2-08 — monthly active headcount for the trailing N months (computed from hiredAt / terminatedAt).',
  })
  @ApiOkResponse({ type: [HeadcountTrendPointDto] })
  public async getHeadcountTrend(
    @Query() query: HeadcountTrendQueryDto,
  ): Promise<HeadcountTrendPointDto[]> {
    try {
      return await this.headcountTrendService.execute({ asOf: query.asOf, months: query.months });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Headcount trend query failed.',
      );
    }
  }

  @Get(':role')
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Get tailored dashboard data for a supported role' })
  @ApiParam({
    name: 'role',
    enum: ['employee', 'project_manager', 'resource_manager', 'hr_manager'],
  })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: RoleDashboardResponseDto })
  public async getRoleDashboard(
    @Param('role') role: string,
    @Req() req: { principal?: { roles?: string[] } },
    @Query('asOf') asOf?: string,
  ): Promise<RoleDashboardResponseDto> {
    // AUTHZ-06: prevent privilege escalation via URL — caller must hold the requested role
    // (admin always passes through).
    const callerRoles = req.principal?.roles ?? [];
    if (!callerRoles.includes('admin') && !callerRoles.includes(role)) {
      throw new ForbiddenException(`Role '${role}' is not in your scope.`);
    }
    try {
      return await this.roleDashboardQueryService.execute({ asOf, role });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Role dashboard query failed.',
      );
    }
  }
}
