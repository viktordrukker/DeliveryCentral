import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { ManagerScopeQueryService } from '@src/modules/organization/application/manager-scope-query.service';

import { PulseService } from '../application/pulse.service';
import {
  PulseEntryDto,
  PulseHistoryDto,
  PulseTeamTrendDto,
  SubmitPulseDto,
} from '../application/contracts/pulse.dto';

@ApiTags('pulse')
@Controller('pulse')
export class PulseController {
  public constructor(
    private readonly service: PulseService,
    private readonly managerScopeQuery: ManagerScopeQueryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequireRoles('employee', 'project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Submit or update own weekly pulse' })
  @ApiOkResponse({ description: 'Pulse entry' })
  public async submit(
    @Body() dto: SubmitPulseDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PulseEntryDto> {
    const personId = this.resolvePersonId(req);
    return this.service.submit(personId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get own pulse history' })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiOkResponse({ description: 'Pulse history' })
  public async getMyHistory(
    @Req() req: { principal?: RequestPrincipal },
    @Query('weeks') weeksStr?: string,
  ): Promise<PulseHistoryDto> {
    const personId = this.resolvePersonId(req);
    const weeks = weeksStr ? parseInt(weeksStr, 10) : 4;
    return this.service.getMyHistory(personId, weeks);
  }

  // HD-7 — team pulse trend tile. Audience: anyone with reports
  // (RM/PM/Director/HR/DM/admin). Scope: the caller's direct +
  // dotted-line reports per the canonical reporting tree. Returns a
  // weekly avgMood / responseCount / strugglingCount series so the FE
  // can plot a sparkline alongside the existing dashboards.
  // Per J7.
  @Get('team-trend')
  @RequireRoles('project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({
    summary:
      'Pulse trend over the caller\'s reporting scope. HD-7 / J7 — RM/PM/Director/HR each see what they manage.',
  })
  @ApiQuery({ name: 'weeks', required: false, type: Number })
  @ApiOkResponse({ description: 'Pulse team trend, one row per week.' })
  public async getTeamTrend(
    @Req() req: { principal?: RequestPrincipal },
    @Query('weeks') weeksStr?: string,
  ): Promise<PulseTeamTrendDto> {
    const callerId = this.resolvePersonId(req);
    const weeks = weeksStr ? Math.max(1, parseInt(weeksStr, 10) || 4) : 4;

    // Reporting tree resolution. Anyone can call this — if you have no
    // reports, the trend is empty (scopePersonCount=0). Pagination is
    // not used here; the trend aggregates the whole scope.
    const scope = await this.managerScopeQuery.getManagerScope({
      managerId: callerId,
      page: 1,
      pageSize: 5000,
    });
    const personIds = [
      ...scope.directReports.map((p) => p.id),
      ...scope.dottedLinePeople.map((p) => p.id),
    ];
    return this.service.getTeamTrend(personIds, weeks);
  }

  private resolvePersonId(req: { principal?: RequestPrincipal }): string {
    const id = req.principal?.personId ?? req.principal?.userId;
    if (!id) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    return id;
  }
}
