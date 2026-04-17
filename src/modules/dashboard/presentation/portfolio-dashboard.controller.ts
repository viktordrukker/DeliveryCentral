import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PortfolioDashboardService } from '../application/portfolio-dashboard.service';

@ApiTags('portfolio-dashboard')
@Controller('dashboard/portfolio')
export class PortfolioDashboardController {
  public constructor(private readonly service: PortfolioDashboardService) {}

  @Get('heatmap')
  @ApiOperation({ summary: 'Portfolio staffing heatmap — projects × weeks colored by fill rate' })
  @ApiOkResponse({ description: 'Portfolio heatmap data.' })
  @RequireRoles('delivery_manager', 'director', 'admin')
  public async getHeatmap(@Query('weeks') weeks?: string) {
    return this.service.getPortfolioHeatmap(weeks ? parseInt(weeks) : undefined);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Portfolio summary KPIs' })
  @ApiOkResponse({ description: 'Portfolio summary.' })
  @RequireRoles('delivery_manager', 'director', 'admin')
  public async getSummary() {
    return this.service.getPortfolioSummary();
  }

  @Get('available-pool')
  @ApiOperation({ summary: 'Available people pool (bench + partial allocation)' })
  @ApiOkResponse({ description: 'Available pool.' })
  @RequireRoles('resource_manager', 'delivery_manager', 'director', 'admin')
  public async getAvailablePool() {
    return this.service.getAvailablePool();
  }
}
