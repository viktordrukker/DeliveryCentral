import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { CreateMilestoneDto, UpdateMilestoneDto } from '../application/contracts/milestone.dto';
import { ProjectMilestoneService } from '../application/project-milestone.service';

@ApiTags('project-milestones')
@Controller('projects')
export class MilestoneController {
  public constructor(private readonly service: ProjectMilestoneService) {}

  @Get(':id/milestones')
  @ApiOperation({ summary: 'List project milestones' })
  @ApiOkResponse({ description: 'Milestones for the project.' })
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async list(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.service.list(projectId);
  }

  @Post(':id/milestones')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a project milestone' })
  @ApiOkResponse({ description: 'Milestone created.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.service.create(projectId, dto);
  }

  @Patch(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update a project milestone' })
  @ApiOkResponse({ description: 'Milestone updated.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async update(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.service.update(milestoneId, dto);
  }

  @Delete(':id/milestones/:milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project milestone' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async remove(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    await this.service.remove(milestoneId);
  }
}
