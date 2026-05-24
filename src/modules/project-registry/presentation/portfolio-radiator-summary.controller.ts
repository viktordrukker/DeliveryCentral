import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { EXEC_ROLES } from '@src/shared/auth/role-presets';

import { PortfolioRadiatorSummaryService } from '../application/portfolio-radiator-summary.service';
import { PortfolioRadiatorSummaryDto } from '../application/contracts/portfolio-radiator-summary.dto';

/**
 * FE-#317 — compact Director Home portfolio summary surface.
 *
 * Lives next to the existing /portfolio/radiator full-list endpoint but
 * under /dashboards/director where Director Home composes it. EXEC_ROLES
 * gate; full surface stays at /portfolio/radiator for the dedicated page.
 */
@ApiTags('dashboards')
@Controller('dashboards/director')
export class PortfolioRadiatorSummaryController {
  public constructor(private readonly service: PortfolioRadiatorSummaryService) {}

  @Get('portfolio-radiator-summary')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({
    summary:
      'FE-#317 — compact portfolio radiator summary for Director Home embedding ' +
      '(RAG distribution + top N risk projects). topN defaults to 3, max 10.',
  })
  @ApiOkResponse({ type: Object })
  public async getSummary(
    @Query('topN', new DefaultValuePipe(3), ParseIntPipe) topN: number,
  ): Promise<PortfolioRadiatorSummaryDto> {
    return this.service.getSummary({ topN });
  }
}
