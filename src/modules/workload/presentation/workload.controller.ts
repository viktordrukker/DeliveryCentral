import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { WorkloadService } from '../application/workload.service';
import { WorkloadMatrixResponse, WorkloadPlanningResponse } from '../application/contracts/workload.dto';

class WorkloadMatrixQueryDto {
  poolId?: string;
  orgUnitId?: string;
  managerId?: string;
}

class WorkloadPlanningQueryDto {
  from?: string;
  to?: string;
  poolId?: string;
}

@ApiTags('workload')
@Controller('workload')
@RequireRoles('resource_manager', 'director', 'admin')
export class WorkloadController {
  public constructor(private readonly service: WorkloadService) {}

  @Get('matrix')
  @ApiOperation({ summary: 'Get workload allocation matrix (person × project)' })
  @ApiQuery({ name: 'poolId', required: false, type: String })
  @ApiQuery({ name: 'orgUnitId', required: false, type: String })
  @ApiQuery({ name: 'managerId', required: false, type: String })
  @ApiOkResponse({ description: 'Workload allocation matrix' })
  public async getMatrix(
    @Query() query: WorkloadMatrixQueryDto,
  ): Promise<WorkloadMatrixResponse> {
    return this.service.getMatrix({
      poolId: query.poolId,
      orgUnitId: query.orgUnitId,
      managerId: query.managerId,
    });
  }

  @Get('capacity-forecast')
  @ApiOperation({ summary: 'Algorithmic 12-week capacity forecast: bench projection + at-risk people' })
  @ApiOkResponse({ description: 'Capacity forecast data' })
  public async getCapacityForecast(
    @Query('weeks') weeks?: string,
    @Query('poolId') poolId?: string,
  ) {
    return this.service.getCapacityForecast({
      poolId,
      weeks: weeks ? Number(weeks) : 12,
    });
  }

  @Get('check-conflict')
  @ApiOperation({ summary: 'Check if adding allocation would overallocate a person' })
  @ApiOkResponse({ description: 'Conflict check result' })
  public async checkConflict(
    @Query('personId') personId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('allocation') allocation: string,
    @Query('excludeAssignmentId') excludeAssignmentId?: string,
  ) {
    if (!personId || !from || !to || !allocation) {
      throw new BadRequestException('personId, from, to, and allocation are required.');
    }
    return this.service.checkConflict({
      allocationPercent: Number(allocation),
      endDate: to,
      excludeAssignmentId,
      personId,
      startDate: from,
    });
  }

  @Get('planning')
  @ApiOperation({ summary: 'Get workload planning timeline (12-week forward)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'poolId', required: false, type: String })
  @ApiOkResponse({ description: 'Workload planning timeline' })
  public async getPlanning(
    @Query() query: WorkloadPlanningQueryDto,
  ): Promise<WorkloadPlanningResponse> {
    return this.service.getPlanning({
      from: query.from,
      to: query.to,
      poolId: query.poolId,
    });
  }
}
