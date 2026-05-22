import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PROJECT_DELIVERY_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { CreateMilestoneDto, UpdateMilestoneDto } from '../application/contracts/milestone.dto';
import { ProjectMilestoneService } from '../application/project-milestone.service';

@ApiTags('project-milestones')
@Controller('projects')
export class MilestoneController {
  public constructor(private readonly service: ProjectMilestoneService) {}

  @Get(':id/milestones')
  @ApiOperation({ summary: 'List project milestones' })
  @ApiOkResponse({ description: 'Milestones for the project.' })
  @RequireRoles(...STAFFING_ROLES)
  public async list(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.service.list(projectId);
  }

  @Post(':id/milestones')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a project milestone' })
  @ApiOkResponse({ description: 'Milestone created.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMilestoneDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    // F-115 / D-103-write-path round 25 — actor-audit threaded into create.
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.service.create(projectId, dto, actorId);
  }

  @Patch(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update a project milestone' })
  @ApiOkResponse({ description: 'Milestone updated.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async update(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ) {
    // F-115 / D-103-write-path round 25 — actor-audit threaded into update.
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;
    return this.service.update(milestoneId, dto, actorId);
  }

  @Delete(':id/milestones/:milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project milestone' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async remove(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    await this.service.remove(milestoneId);
  }
}
