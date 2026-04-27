import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  CreateTeamRequestDto,
  TeamDashboardDto,
  TeamListResponseDto,
  TeamMembersResponseDto,
  TeamSummaryDto,
  UpdateTeamMemberRequestDto,
} from '../application/contracts/team.dto';
import { CreateTeamService } from '../application/create-team.service';
import { TeamQueryService } from '../application/team-query.service';
import { UpdateTeamMemberService } from '../application/update-team-member.service';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  public constructor(
    private readonly teamQueryService: TeamQueryService,
    private readonly createTeamService: CreateTeamService,
    private readonly updateTeamMemberService: UpdateTeamMemberService,
  ) {}

  @Get()
  @RequireRoles('employee', 'project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'List operational teams' })
  @ApiOkResponse({ type: TeamListResponseDto })
  public async listTeams(): Promise<TeamListResponseDto> {
    return this.teamQueryService.listTeams();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an operational team' })
  @ApiCreatedResponse({ type: TeamSummaryDto })
  @RequireRoles('resource_manager', 'director', 'admin')
  public async createTeam(@Body() request: CreateTeamRequestDto): Promise<TeamSummaryDto> {
    try {
      const created = await this.createTeamService.execute(request);
      const team = await this.teamQueryService.getTeam(created.id);

      if (!team) {
        throw new Error('Team not found.');
      }

      return team;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Team creation failed.',
      );
    }
  }

  @Get(':id')
  @RequireRoles('employee', 'project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get an operational team by id' })
  @ApiOkResponse({ type: TeamSummaryDto })
  public async getTeam(@Param('id', ParseUUIDPipe) id: string): Promise<TeamSummaryDto> {
    const team = await this.teamQueryService.getTeam(id);
    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    return team;
  }

  @Get(':id/members')
  @RequireRoles('employee', 'project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get operational team members' })
  @ApiOkResponse({ type: TeamMembersResponseDto })
  public async getTeamMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('asOf') asOf?: string,
  ): Promise<TeamMembersResponseDto> {
    const members = await this.teamQueryService.getTeamMembersAsOf(
      id,
      asOf ? new Date(asOf) : new Date(),
    );
    if (!members) {
      throw new NotFoundException('Team not found.');
    }

    return members;
  }

  @Get(':id/dashboard')
  @RequireRoles('project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get operational team dashboard summary' })
  @ApiOkResponse({ type: TeamDashboardDto })
  public async getTeamDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('asOf') asOf?: string,
  ): Promise<TeamDashboardDto> {
    const dashboard = await this.teamQueryService.getTeamDashboard(
      id,
      asOf ? new Date(asOf) : new Date(),
    );
    if (!dashboard) {
      throw new NotFoundException('Team not found.');
    }

    return dashboard;
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or remove a team member' })
  @ApiOkResponse({ type: TeamMembersResponseDto })
  @RequireRoles('resource_manager', 'director', 'admin')
  public async updateTeamMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateTeamMemberRequestDto,
  ): Promise<TeamMembersResponseDto> {
    try {
      await this.updateTeamMemberService.execute({
        action: request.action,
        personId: request.personId,
        teamId: id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Team member update failed.';

      if (message === 'Team not found.' || message === 'Person not found.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }

    const members = await this.teamQueryService.getTeamMembersAsOf(id, new Date());
    if (!members) {
      throw new NotFoundException('Team not found.');
    }

    return members;
  }
}
