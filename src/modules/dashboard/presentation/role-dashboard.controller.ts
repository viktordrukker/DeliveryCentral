import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AllowSelfScope } from '@src/modules/identity-access/application/self-scope.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { DeliveryManagerDashboardQueryService } from '../application/delivery-manager-dashboard-query.service';
import { DeliveryManagerDashboardResponseDto, ProjectScorecardHistoryItemDto } from '../application/contracts/delivery-manager-dashboard.dto';
import { DirectorDashboardQueryService } from '../application/director-dashboard-query.service';
import { DirectorDashboardResponseDto } from '../application/contracts/director-dashboard.dto';
import { EmployeeDashboardQueryService } from '../application/employee-dashboard-query.service';
import { EmployeeDashboardResponseDto } from '../application/contracts/employee-dashboard.dto';
import { HrManagerDashboardResponseDto } from '../application/contracts/hr-manager-dashboard.dto';
import { ProjectManagerDashboardResponseDto } from '../application/contracts/project-manager-dashboard.dto';
import { HrManagerDashboardQueryService } from '../application/hr-manager-dashboard-query.service';
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
  @RequireRoles('resource_manager', 'director', 'admin')
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
  @RequireRoles('hr_manager', 'director', 'admin')
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
  @RequireRoles('delivery_manager', 'director', 'admin')
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
  @RequireRoles('delivery_manager', 'director', 'admin')
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
  @RequireRoles('director', 'admin')
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

  @Get(':role')
  @ApiOperation({ summary: 'Get tailored dashboard data for a supported role' })
  @ApiParam({
    name: 'role',
    enum: ['employee', 'project_manager', 'resource_manager', 'hr_manager'],
  })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: RoleDashboardResponseDto })
  public async getRoleDashboard(
    @Param('role') role: string,
    @Query('asOf') asOf?: string,
  ): Promise<RoleDashboardResponseDto> {
    try {
      return await this.roleDashboardQueryService.execute({ asOf, role });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Role dashboard query failed.',
      );
    }
  }
}
