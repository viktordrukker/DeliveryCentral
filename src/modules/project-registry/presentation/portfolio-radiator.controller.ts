import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PortfolioRadiatorService } from '../application/portfolio-radiator.service';

@ApiTags('portfolio-radiator')
@Controller('portfolio')
export class PortfolioRadiatorController {
  public constructor(private readonly service: PortfolioRadiatorService) {}

  @Get('radiator')
  @ApiOperation({ summary: 'Get portfolio-wide radiator rollup' })
  @ApiOkResponse({ description: 'Portfolio radiator entries.' })
  @RequireRoles('delivery_manager', 'director', 'admin')
  public async getPortfolio() {
    return this.service.getPortfolio();
  }
}
