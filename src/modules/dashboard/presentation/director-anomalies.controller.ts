import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { EXEC_ROLES } from '@src/shared/auth/role-presets';

import { DirectorAnomalyDetectionService } from '../application/director-anomaly-detection.service';
import { DirectorAnomalyDto } from '../application/contracts/director-anomaly.dto';
import { PortfolioFinanceSummaryService } from '../application/portfolio-finance-summary.service';
import { PortfolioFinanceSummaryDto } from '../application/contracts/portfolio-finance-summary.dto';

@ApiTags('dashboards')
@Controller('dashboards/director')
export class DirectorAnomaliesController {
  public constructor(
    private readonly service: DirectorAnomalyDetectionService,
    private readonly financeService: PortfolioFinanceSummaryService,
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
}
