import { BadRequestException, Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { EXEC_ROLES, HR_GOVERNANCE_ROLES } from '@src/shared/auth/role-presets';

import { DirectorAnomalyDetectionService } from '../application/director-anomaly-detection.service';
import { DirectorAnomalyDto } from '../application/contracts/director-anomaly.dto';
import { OrgHealthService } from '../application/org-health.service';
import { OrgHealthResponseDto } from '../application/contracts/org-health.dto';
import { PortfolioFinanceSummaryService } from '../application/portfolio-finance-summary.service';
import { PortfolioFinanceSummaryDto } from '../application/contracts/portfolio-finance-summary.dto';
import { BenchAgingByDimensionService } from '../application/bench-aging-by-dimension.service';
import {
  BenchAgingByDimensionResponseDto,
  BenchAgingDimension,
} from '../application/contracts/bench-aging-by-dimension.dto';

const DIRECTOR_AND_HR_ROLES: readonly PlatformRole[] = Array.from(
  new Set<PlatformRole>([...EXEC_ROLES, ...HR_GOVERNANCE_ROLES]),
);

@ApiTags('dashboards')
@Controller('dashboards/director')
export class DirectorAnomaliesController {
  public constructor(
    private readonly service: DirectorAnomalyDetectionService,
    private readonly financeService: PortfolioFinanceSummaryService,
    private readonly orgHealthService: OrgHealthService,
    private readonly benchAgingService: BenchAgingByDimensionService,
  ) {}

  @Get('anomalies')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({
    summary:
      'FE-#265 — Director "What needs you now" anomalies. Top-N sorted by ' +
      'severity DESC × decayRate DESC.',
  })
  @ApiOkResponse({ type: [Object] })
  public async list(
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<DirectorAnomalyDto[]> {
    return this.service.detect({ limit });
  }

  @Get('finance')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({
    summary:
      'Portfolio finance summary (totalBudget / totalActualCost / totalEarnedValue / ' +
      'cpi / overBudgetProjectCount) aggregated over ProjectBudget rows for a fiscal year.',
  })
  @ApiOkResponse({ type: PortfolioFinanceSummaryDto })
  public async finance(
    @Query('fiscalYear', new DefaultValuePipe(0), ParseIntPipe) fiscalYear: number,
  ): Promise<PortfolioFinanceSummaryDto> {
    return this.financeService.summarize(fiscalYear > 0 ? fiscalYear : undefined);
  }

  @Get('org-health')
  @RequireRoles(...DIRECTOR_AND_HR_ROLES)
  @ApiOperation({
    summary:
      'LEAN-P4-missing-5 — Org health by OrganizationalUnit. Per active OrgUnit ' +
      'returns headcount (active PersonOrgMemberships covering asOf), staffed ' +
      'count (members on active ProjectPosition), bench size (headcount - staffed), ' +
      'and unfill rate (bench / headcount). Sorted by unfill DESC then headcount DESC.',
  })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  @ApiOkResponse({ type: OrgHealthResponseDto })
  public async orgHealth(@Query('asOf') asOf?: string): Promise<OrgHealthResponseDto> {
    return this.orgHealthService.execute(asOf);
  }

  @Get('bench-aging')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({
    summary:
      'LEAN-P4b-3 — Portfolio bench aging matrix: people-on-bench grouped by ' +
      'skill or org-unit and bucketed by days-on-bench (0-7 / 8-30 / 31-60 / ' +
      '61-90 / 90+).',
  })
  @ApiQuery({ name: 'dimension', enum: ['skill', 'unit'], required: false })
  @ApiOkResponse({ type: BenchAgingByDimensionResponseDto })
  public async benchAging(
    @Query('dimension', new DefaultValuePipe('skill')) dimension: string,
  ): Promise<BenchAgingByDimensionResponseDto> {
    if (dimension !== 'skill' && dimension !== 'unit') {
      throw new BadRequestException("dimension must be 'skill' or 'unit'");
    }
    return this.benchAgingService.summarize(dimension as BenchAgingDimension);
  }
}
