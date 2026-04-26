import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { UpsertPulseReportDto } from '../application/contracts/pulse-report.dto';
import { PulseReportService } from '../application/pulse-report.service';

@ApiTags('project-pulse-report')
@Controller()
export class PulseReportController {
  public constructor(private readonly service: PulseReportService) {}

  @Get('projects/:id/pulse-report')
  @ApiOperation({ summary: 'Get current (or empty scaffold) weekly Pulse report with per-dimension tiers.' })
  @ApiOkResponse({ description: 'PulseReportDto.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getCurrent(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.service.getCurrent(projectId);
  }

  @Put('projects/:id/pulse-report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert this week`s Pulse report. Set submit=true to mark submitted.' })
  @ApiOkResponse({ description: 'Updated PulseReportDto.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async upsert(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: UpsertPulseReportDto,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    return this.service.upsert(projectId, dto, httpRequest.principal?.personId ?? null);
  }
}
