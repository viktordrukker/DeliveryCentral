import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChangeRequestStatus } from '@prisma/client';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { PROJECT_DELIVERY_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import {
  CreateChangeRequestDto,
  UpdateChangeRequestDto,
} from '../application/contracts/change-request.dto';
import { ProjectChangeRequestService } from '../application/project-change-request.service';

@ApiTags('project-change-requests')
@Controller('projects')
export class ChangeRequestController {
  public constructor(private readonly service: ProjectChangeRequestService) {}

  @Get(':id/change-requests')
  @ApiOperation({ summary: 'List project change requests' })
  @ApiOkResponse({ description: 'Change requests for the project.' })
  @RequireRoles(...STAFFING_ROLES)
  public async list(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Query('status') status?: string,
  ) {
    return this.service.list({
      projectId,
      status: status as ChangeRequestStatus | undefined,
    });
  }

  @Post(':id/change-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a project change request' })
  @ApiOkResponse({ description: 'Change request created.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateChangeRequestDto,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId;
    return this.service.create(projectId, { ...dto, requesterPersonId: actorId ?? null });
  }

  @Patch(':id/change-requests/:crId')
  @ApiOperation({ summary: 'Update a project change request' })
  @ApiOkResponse({ description: 'Change request updated.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async update(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('crId', ParseUUIDPipe) crId: string,
    @Body() dto: UpdateChangeRequestDto,
  ) {
    return this.service.update(crId, dto);
  }

  @Post(':id/change-requests/:crId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a project change request' })
  @ApiOkResponse({ description: 'Change request approved.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async approve(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('crId', ParseUUIDPipe) crId: string,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? 'unknown';
    return this.service.approve(crId, actorId);
  }

  @Post(':id/change-requests/:crId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a project change request' })
  @ApiOkResponse({ description: 'Change request rejected.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async reject(
    @Param('id', ParseUUIDPipe) _projectId: string,
    @Param('crId', ParseUUIDPipe) crId: string,
    @Req() httpRequest: { principal?: { personId?: string } },
  ) {
    const actorId = httpRequest.principal?.personId ?? 'unknown';
    return this.service.reject(crId, actorId);
  }
}
