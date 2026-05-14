import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';
import { OrgChartResponseDto } from '../application/contracts/org-chart.dto';
import { OrgChartQueryService } from '../application/org-chart-query.service';

@ApiTags('org-chart')
@Controller('org/chart')
export class OrgChartController {
  public constructor(private readonly orgChartQueryService: OrgChartQueryService) {}

  @Get()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Get org chart hierarchy and dotted-line relationships' })
  @ApiOkResponse({ type: OrgChartResponseDto })
  public async getOrgChart(): Promise<OrgChartResponseDto> {
    return this.orgChartQueryService.getOrgChart();
  }
}
