import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { RadiatorOverrideDto } from '../application/contracts/radiator-override.dto';
import { RadiatorOverrideService } from '../application/radiator-override.service';
import { RadiatorScoringService } from '../application/radiator-scoring.service';

@ApiTags('project-radiator')
@Controller()
export class RadiatorController {
  public constructor(
    private readonly scoringService: RadiatorScoringService,
    private readonly overrideService: RadiatorOverrideService,
  ) {}

  @Get('projects/:id/radiator')
  @ApiOperation({ summary: 'Get current radiator snapshot for a project' })
  @ApiOkResponse({ description: 'Current radiator snapshot.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getRadiator(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.scoringService.computeRadiator(projectId);
  }

  @Get('projects/:id/radiator/history')
  @ApiOperation({ summary: 'Get radiator history (past N weeks)' })
  @ApiOkResponse({ description: 'Radiator history entries.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getHistory(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query('weeks') weeks?: string,
  ) {
    const w = weeks ? Math.max(1, Math.min(52, parseInt(weeks, 10) || 12)) : 12;
    return this.scoringService.getHistory(projectId, w);
  }

  @Get('projects/:id/radiator/snapshot/:weekStarting')
  @ApiOperation({ summary: 'Get radiator snapshot for a specific ISO week' })
  @ApiOkResponse({ description: 'Historical radiator snapshot or null.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getSnapshot(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('weekStarting') weekStarting: string,
  ) {
    return this.scoringService.getSnapshotByWeek(projectId, weekStarting);
  }

  @Post('projects/:id/radiator/override')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a manual override to a radiator sub-dimension' })
  @ApiOkResponse({ description: 'Updated radiator snapshot.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async applyOverride(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: RadiatorOverrideDto,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? 'unknown';
    return this.overrideService.applyOverride(
      projectId,
      dto.subDimensionKey,
      dto.overrideScore,
      dto.reason,
      actorId,
    );
  }

  @Post('projects/:id/radiator/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually invalidate the 60s radiator cache for this project and return a fresh snapshot.' })
  @ApiOkResponse({ description: 'Fresh radiator snapshot.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async refresh(@Param('id', ParseUUIDPipe) projectId: string) {
    this.scoringService.invalidateCache(projectId);
    return this.scoringService.computeRadiator(projectId);
  }
}
