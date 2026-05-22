import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RiskCategory, RiskStatus, RiskType } from '@prisma/client';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PROJECT_DELIVERY_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { ProjectRiskService } from '../application/project-risk.service';
import {
  CreateProjectRiskDto,
  UpdateProjectRiskDto,
  ConvertToIssueDto,
} from '../application/contracts/project-risk.dto';

@ApiTags('project-risks')
@Controller('projects')
export class ProjectRiskController {
  public constructor(private readonly riskService: ProjectRiskService) {}

  // ── Static paths first (before :riskId param routes) ───────────────────

  @Get(':id/risks/matrix')
  @ApiOperation({ summary: 'Get probability/impact risk matrix' })
  @ApiOkResponse({ description: 'Risk matrix.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getRiskMatrix(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.riskService.getRiskMatrix(projectId);
  }

  @Get(':id/risks/summary')
  @ApiOperation({ summary: 'Get risk summary for project' })
  @ApiOkResponse({ description: 'Risk summary.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getRiskSummary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.riskService.getRiskSummary(projectId);
  }

  @Get(':id/risks')
  @ApiOperation({ summary: 'List project risks/issues' })
  @ApiOkResponse({ description: 'List of risks.' })
  @RequireRoles(...STAFFING_ROLES)
  public async list(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query('riskType') riskType?: RiskType,
    @Query('status') status?: RiskStatus,
    @Query('category') category?: RiskCategory,
  ) {
    return this.riskService.list(projectId, { riskType, status, category });
  }

  @Post(':id/risks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project risk' })
  @ApiOkResponse({ description: 'Risk created.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectRiskDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    // F-123 / D-103-write-path round 33 — actor-audit threaded into all writes.
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.riskService.create(projectId, dto, actorId);
  }

  // ── Parameterized :riskId routes ───────────────────────────────────────

  @Patch(':id/risks/:riskId')
  @ApiOperation({ summary: 'Update a project risk' })
  @ApiOkResponse({ description: 'Risk updated.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async update(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Body() dto: UpdateProjectRiskDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.riskService.update(riskId, dto, actorId);
  }

  @Post(':id/risks/:riskId/convert-to-issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert a risk to an issue' })
  @ApiOkResponse({ description: 'Issue created from risk.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async convertToIssue(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Body() dto: ConvertToIssueDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.riskService.convertToIssue(riskId, dto.assigneePersonId, actorId);
  }

  @Post(':id/risks/:riskId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a risk/issue' })
  @ApiOkResponse({ description: 'Risk resolved.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async resolve(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.riskService.resolve(riskId, actorId);
  }

  @Post(':id/risks/:riskId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a risk/issue' })
  @ApiOkResponse({ description: 'Risk closed.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async close(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.riskService.close(riskId, actorId);
  }
}
