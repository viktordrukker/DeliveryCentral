import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ProjectPulseService } from '../application/project-pulse.service';

@ApiTags('project-pulse')
@Controller()
export class ProjectPulseController {
  public constructor(private readonly pulseService: ProjectPulseService) {}

  @Get('projects/:id/pulse-summary')
  @ApiOperation({ summary: 'Unified project pulse: signals KPIs + 7d activity stream' })
  @ApiOkResponse({ description: 'Pulse summary DTO.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getPulseSummary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.pulseService.getPulseSummary(projectId);
  }
}
