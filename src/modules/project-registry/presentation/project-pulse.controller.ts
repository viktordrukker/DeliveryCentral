import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { ProjectPulseQueryService } from '../application/project-pulse-query.service';
import { ProjectPulseService } from '../application/project-pulse.service';
import { ProjectPulseSnapshotDto } from '../application/contracts/project-pulse-snapshot.dto';

@ApiTags('project-pulse')
@Controller()
export class ProjectPulseController {
  public constructor(
    private readonly pulseService: ProjectPulseService,
    private readonly pulseQuery: ProjectPulseQueryService,
  ) {}

  @Get('projects/:id/pulse-summary')
  @ApiOperation({ summary: 'Unified project pulse: signals KPIs + 7d activity stream' })
  @ApiOkResponse({ description: 'Pulse summary DTO.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getPulseSummary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.pulseService.getPulseSummary(projectId);
  }

  @Get('projects/:id/pulse')
  @ApiOperation({
    summary:
      'S3-1 — Lean PM Decision Dashboard snapshot: quadrant RAG + lean-staffing positions ' +
      '+ budget variance (EVM-fed) + next milestone + top 3 risks + next decision.',
  })
  @ApiOkResponse({ description: 'Project Pulse snapshot DTO.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getPulse(
    @Param('id', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectPulseSnapshotDto> {
    return this.pulseQuery.getPulseSnapshot(projectId);
  }
}
