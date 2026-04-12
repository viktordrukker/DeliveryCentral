import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { getCached, setCache } from '@src/shared/cache/simple-cache';

import { PlannedVsActualResponseDto } from '../application/contracts/planned-vs-actual.dto';
import { PlannedVsActualQueryDto } from '../application/contracts/planned-vs-actual.query';
import { PlannedVsActualQueryService } from '../application/planned-vs-actual-query.service';
import { WorkloadDashboardQueryDto, WorkloadTrendQueryDto } from '../application/contracts/workload-dashboard.query';
import { WorkloadDashboardSummaryDto, WorkloadTrendPointDto } from '../application/contracts/workload-dashboard.dto';
import { WorkloadDashboardQueryService } from '../application/workload-dashboard-query.service';

@ApiTags('dashboard')
@Controller('dashboard/workload')
@RequireRoles('resource_manager', 'delivery_manager', 'director', 'admin')
export class WorkloadDashboardController {
  public constructor(
    private readonly workloadDashboardQueryService: WorkloadDashboardQueryService,
    private readonly plannedVsActualQueryService: PlannedVsActualQueryService,
  ) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get workload dashboard summary cards and lists' })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: WorkloadDashboardSummaryDto })
  public async getSummary(
    @Query() query: WorkloadDashboardQueryDto,
  ): Promise<WorkloadDashboardSummaryDto> {
    try {
      return await this.workloadDashboardQueryService.execute(query);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Dashboard summary query failed.',
      );
    }
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get weekly headcount trend for the last N weeks' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiOkResponse({ type: [WorkloadTrendPointDto] })
  public async getTrend(
    @Query() query: WorkloadTrendQueryDto,
  ): Promise<WorkloadTrendPointDto[]> {
    try {
      const weeks = Math.min(Math.max(parseInt(query.weeks ?? '12', 10) || 12, 1), 52);
      const trendCacheKey = `workload-trend:${weeks}`;
      const cached = getCached<WorkloadTrendPointDto[]>(trendCacheKey);
      if (cached) {
        return cached;
      }

      const now = new Date();
      const results: WorkloadTrendPointDto[] = [];

      for (let i = weeks - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const asOf = d.toISOString();
        const summary = await this.workloadDashboardQueryService.execute({ asOf });
        results.push({
          activeAssignments: summary.totalActiveAssignments,
          week: asOf.slice(0, 10),
        });
      }

      setCache(trendCacheKey, results, 60_000);

      return results;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Trend query failed.',
      );
    }
  }

  @Get('planned-vs-actual')
  @ApiOperation({ summary: 'Get planned vs actual comparison categories for staffing and evidence' })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'personId', required: false, type: String })
  @ApiOkResponse({ type: PlannedVsActualResponseDto })
  public async getPlannedVsActual(
    @Query() query: PlannedVsActualQueryDto,
  ): Promise<PlannedVsActualResponseDto> {
    try {
      return await this.plannedVsActualQueryService.execute(query);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Planned vs actual query failed.',
      );
    }
  }
}
