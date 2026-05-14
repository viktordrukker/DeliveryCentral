import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PROJECT_DELIVERY_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { ProjectExceptionsService } from '../application/project-exceptions.service';
import { ProjectRiskService } from '../application/project-risk.service';

@ApiTags('project-exceptions')
@Controller()
export class ProjectExceptionsController {
  public constructor(
    private readonly exceptionsService: ProjectExceptionsService,
    private readonly riskService: ProjectRiskService,
  ) {}

  @Get('projects/:id/exceptions')
  @ApiOperation({ summary: 'Aggregate exception rows: overdue risks, slipped milestones, stale CRs, timesheet gaps, vacant roles.' })
  @ApiOkResponse({ description: 'Exceptions DTO.' })
  @RequireRoles(...STAFFING_ROLES)
  public async getExceptions(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.exceptionsService.getExceptions(projectId);
  }

  @Post('projects/:id/risks/:riskId/mark-reviewed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a risk as reviewed — resets lastReviewedAt.' })
  @ApiOkResponse({ description: 'Updated risk.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async markRiskReviewed(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
  ) {
    const risk = await this.riskService.markReviewed(riskId);
    this.exceptionsService.invalidate(projectId);
    return risk;
  }
}
