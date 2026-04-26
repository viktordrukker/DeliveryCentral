import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { SpcService } from '../application/spc.service';

@ApiTags('project-spc')
@Controller()
export class SpcController {
  public constructor(private readonly spcService: SpcService) {}

  @Get('projects/:id/spc-burndown')
  @ApiOperation({ summary: 'SPC burndown: hours + Standardized Production Cost per week, plus vendor accrual.' })
  @ApiOkResponse({ description: 'SPC burndown DTO.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getBurndown(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query('weeks') weeks?: string,
  ) {
    const w = weeks ? Math.max(1, Math.min(52, Number.parseInt(weeks, 10) || 12)) : 12;
    return this.spcService.getBurndown(projectId, w);
  }
}
