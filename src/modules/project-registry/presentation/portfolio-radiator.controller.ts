import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { DELIVERY_EXEC_ROLES } from '@src/shared/auth/role-presets';
import { PortfolioRadiatorService } from '../application/portfolio-radiator.service';

@ApiTags('portfolio-radiator')
@Controller('portfolio')
export class PortfolioRadiatorController {
  public constructor(private readonly service: PortfolioRadiatorService) {}

  @Get('radiator')
  @ApiOperation({ summary: 'Get portfolio-wide radiator rollup' })
  @ApiOkResponse({ description: 'Portfolio radiator entries.' })
  @RequireRoles(...DELIVERY_EXEC_ROLES)
  public async getPortfolio() {
    return this.service.getPortfolio();
  }
}
