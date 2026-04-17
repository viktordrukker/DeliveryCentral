import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ReportBuilderService, ReportTemplate } from '../application/report-builder.service';
import { UtilizationReport, UtilizationService } from '../application/utilization.service';

@ApiTags('reports')
@Controller('reports')
@RequireRoles('project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
export class ReportsController {
  public constructor(
    private readonly utilizationService: UtilizationService,
    private readonly reportBuilderService: ReportBuilderService,
  ) {}

  @Get('utilization')
  @ApiOperation({ summary: 'Utilization report: available / assigned / actual hours per person + org unit rollup' })
  @ApiOkResponse({ description: 'Utilization report' })
  public async getUtilization(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('personId') personId?: string,
    @Query('stdHoursPerDay') stdHoursPerDay?: string,
  ): Promise<UtilizationReport> {
    const fromDate = from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = to ?? new Date().toISOString().slice(0, 10);
    return this.utilizationService.getReport({
      from: fromDate,
      orgUnitId,
      personId,
      stdHoursPerDay: stdHoursPerDay ? Number(stdHoursPerDay) : 8,
      to: toDate,
    });
  }

  // ── Report Builder ─────────────────────────────────────────────────────

  @Get('builder/sources')
  @ApiOperation({ summary: 'List available data sources for the report builder' })
  @ApiOkResponse({ description: 'Available sources and columns.' })
  public getBuilderSources() {
    return this.reportBuilderService.getAvailableSources();
  }

  @Get('templates')
  @ApiOperation({ summary: 'List report templates' })
  @ApiOkResponse({ description: 'Report templates.' })
  public listTemplates(@Query('ownerPersonId') ownerPersonId?: string): ReportTemplate[] {
    return this.reportBuilderService.listTemplates(ownerPersonId);
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a report template' })
  @ApiCreatedResponse({ description: 'Report template saved.' })
  public createTemplate(@Body() body: Omit<ReportTemplate, 'id' | 'createdAt'>): ReportTemplate {
    try {
      return this.reportBuilderService.createTemplate(
        body.name,
        body.ownerPersonId,
        body.dataSource,
        body.selectedColumns,
        body.filters ?? [],
        body.sortBy,
        body.sortDir,
        body.isShared,
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Failed to save template.');
    }
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report template' })
  public deleteTemplate(@Param('id') id: string): void {
    const deleted = this.reportBuilderService.deleteTemplate(id);
    if (!deleted) {
      throw new NotFoundException('Report template not found.');
    }
  }
}
