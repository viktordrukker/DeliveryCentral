import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RiskCategory, RiskStatus, RiskType } from '@prisma/client';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

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
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getRiskMatrix(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.riskService.getRiskMatrix(projectId);
  }

  @Get(':id/risks/summary')
  @ApiOperation({ summary: 'Get risk summary for project' })
  @ApiOkResponse({ description: 'Risk summary.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getRiskSummary(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.riskService.getRiskSummary(projectId);
  }

  @Get(':id/risks')
  @ApiOperation({ summary: 'List project risks/issues' })
  @ApiOkResponse({ description: 'List of risks.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
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
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectRiskDto,
  ) {
    return this.riskService.create(projectId, dto);
  }

  // ── Parameterized :riskId routes ───────────────────────────────────────

  @Patch(':id/risks/:riskId')
  @ApiOperation({ summary: 'Update a project risk' })
  @ApiOkResponse({ description: 'Risk updated.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async update(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Body() dto: UpdateProjectRiskDto,
  ) {
    return this.riskService.update(riskId, dto);
  }

  @Post(':id/risks/:riskId/convert-to-issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert a risk to an issue' })
  @ApiOkResponse({ description: 'Issue created from risk.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async convertToIssue(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @Body() dto: ConvertToIssueDto,
  ) {
    return this.riskService.convertToIssue(riskId, dto.assigneePersonId);
  }

  @Post(':id/risks/:riskId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a risk/issue' })
  @ApiOkResponse({ description: 'Risk resolved.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async resolve(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
  ) {
    return this.riskService.resolve(riskId);
  }

  @Post(':id/risks/:riskId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a risk/issue' })
  @ApiOkResponse({ description: 'Risk closed.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async close(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
  ) {
    return this.riskService.close(riskId);
  }
}
