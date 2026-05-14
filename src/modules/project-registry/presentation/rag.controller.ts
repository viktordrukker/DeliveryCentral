import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PROJECT_DELIVERY_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { ProjectRagService, CreateRagSnapshotDto } from '../application/project-rag.service';

@ApiTags('project-rag')
@Controller('projects')
export class ProjectRagController {
  public constructor(private readonly ragService: ProjectRagService) {}

  @Get(':id/rag-enhanced')
  @ApiOperation({ summary: 'Get enhanced RAG with scope, business, and risk dimensions' })
  @ApiOkResponse({ description: 'Enhanced computed RAG with dimension hints.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getEnhancedRag(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.ragService.computeEnhancedRag(projectId);
  }

  @Get(':id/rag-computed')
  @ApiOperation({ summary: 'Get real-time computed RAG (no snapshot)' })
  @ApiOkResponse({ description: 'Computed RAG with explanations.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getComputedRag(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.ragService.computeRag(projectId);
  }

  @Get(':id/staffing-alerts')
  @ApiOperation({ summary: 'Get auto-generated staffing alerts' })
  @ApiOkResponse({ description: 'Staffing alerts.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getStaffingAlerts(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.ragService.getStaffingAlerts(projectId);
  }

  @Post(':id/rag-snapshots')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update weekly RAG snapshot' })
  @ApiOkResponse({ description: 'RAG snapshot saved.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async createSnapshot(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateRagSnapshotDto,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? 'unknown';
    return this.ragService.createOrUpdateSnapshot(projectId, dto, actorId);
  }

  @Get(':id/rag-snapshots')
  @ApiOperation({ summary: 'Get RAG snapshot history' })
  @ApiOkResponse({ description: 'RAG history.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getHistory(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query('weeks') weeks?: string,
  ) {
    return this.ragService.getSnapshotHistory(projectId, weeks ? parseInt(weeks) : undefined);
  }

  @Get(':id/rag-snapshots/latest')
  @ApiOperation({ summary: 'Get latest RAG snapshot' })
  @ApiOkResponse({ description: 'Latest RAG snapshot or null.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getLatest(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.ragService.getLatestSnapshot(projectId);
  }
}
