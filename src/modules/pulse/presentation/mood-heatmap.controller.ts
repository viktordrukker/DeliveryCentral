import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { MoodHeatmapService, MoodHeatmapResponse } from '../application/mood-heatmap.service';

@ApiTags('reports')
@Controller('reports')
export class MoodHeatmapController {
  public constructor(private readonly service: MoodHeatmapService) {}

  @Get('mood-heatmap')
  @RequireRoles('hr_manager', 'delivery_manager', 'resource_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Team mood heatmap' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'orgUnitId', required: false, type: String })
  @ApiQuery({ name: 'managerId', required: false, type: String })
  @ApiQuery({ name: 'poolId', required: false, type: String })
  @ApiOkResponse({ description: 'Mood heatmap data' })
  public async getHeatmap(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('managerId') managerId?: string,
    @Query('poolId') poolId?: string,
  ): Promise<MoodHeatmapResponse> {
    return this.service.getHeatmap({ from, to, orgUnitId, managerId, poolId });
  }
}
