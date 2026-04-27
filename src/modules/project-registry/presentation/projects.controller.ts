import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ActivateProjectService } from '../application/activate-project.service';
import { AssignProjectTeamService } from '../application/assign-project-team.service';
import { AssignProjectTeamRequestDto } from '../application/contracts/assign-project-team.request';
import { AssignProjectTeamResponseDto } from '../application/contracts/assign-project-team.response';
import { CloseProjectService } from '../application/close-project.service';
import { CloseProjectOverrideRequestDto } from '../application/contracts/close-project-override.request';
import { CreateProjectRequestDto } from '../application/contracts/create-project.request';
import { ProjectClosureResponseDto } from '../application/contracts/project-closure.response';
import { ProjectCreatedResponseDto } from '../application/contracts/project-created.response';
import { ProjectDirectoryQueryDto } from '../application/contracts/project-directory.query';
import { ProjectDetailsDto, ProjectDirectoryResponseDto } from '../application/contracts/project-directory.dto';
import { CreateProjectService } from '../application/create-project.service';
import { GetProjectByIdService } from '../application/get-project-by-id.service';
import { ProjectDashboardQueryService, ProjectDashboardResponseDto } from '../application/project-dashboard-query.service';
import { ProjectDirectoryQueryService } from '../application/project-directory-query.service';
import { ProjectClosureReadinessService } from '../application/project-closure-readiness.service';
import { ProjectHealthDto, ProjectHealthQueryService } from '../application/project-health-query.service';
import { ProjectLifecycleConflictError } from '../application/project-lifecycle-conflict.error';
import { UpdateProjectService } from '../application/update-project.service';
import { Project, ProjectStatus } from '../domain/entities/project.entity';

class UpdateProjectRequestDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  projectManagerId?: string;
  deliveryManagerId?: string;
}

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  public constructor(
    private readonly projectDirectoryQueryService: ProjectDirectoryQueryService,
    private readonly projectDashboardQueryService: ProjectDashboardQueryService,
    private readonly getProjectByIdService: GetProjectByIdService,
    private readonly createProjectService: CreateProjectService,
    private readonly activateProjectService: ActivateProjectService,
    private readonly closeProjectService: CloseProjectService,
    private readonly assignProjectTeamService: AssignProjectTeamService,
    private readonly updateProjectService: UpdateProjectService,
    private readonly projectHealthQueryService: ProjectHealthQueryService,
    private readonly closureReadinessService: ProjectClosureReadinessService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Create an internal project with charter fields' })
  @ApiCreatedResponse({ type: ProjectCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Project manager not found.' })
  public async createProject(
    @Body() request: CreateProjectRequestDto,
  ): Promise<ProjectCreatedResponseDto> {
    return this.mapCreatedProjectResponse(
      await this.withProjectCreationErrors(() => this.createProjectService.execute(request)),
    );
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Activate a draft internal project' })
  @ApiOkResponse({ type: ProjectCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async activateProject(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectCreatedResponseDto> {
    return this.mapCreatedProjectResponse(
      await this.withProjectActivationErrors(() => this.activateProjectService.execute(id)),
    );
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an active internal project and generate workspend summary' })
  @ApiOkResponse({ type: ProjectClosureResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @RequireRoles('project_manager', 'director', 'admin')
  public async closeProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { principal?: RequestPrincipal },
  ): Promise<ProjectClosureResponseDto> {
    const result = await this.withProjectLifecycleErrors(() =>
      this.closeProjectService.execute(id, {
        actorId: request.principal?.personId ?? request.principal?.userId ?? null,
      }),
    );

    return {
      id: result.project.projectId.value,
      name: result.project.name,
      projectCode: result.project.projectCode,
      status: result.project.status,
      version: result.project.version,
      workspend: result.workspend,
    };
  }

  @Post(':id/close-override')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Close an active internal project using an explicit override when blocking staffing conditions remain',
  })
  @ApiOkResponse({ type: ProjectClosureResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @RequireRoles('director', 'admin')
  public async closeProjectOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: CloseProjectOverrideRequestDto,
    @Req() httpRequest: { principal?: RequestPrincipal },
  ): Promise<ProjectClosureResponseDto> {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;

    if (!actorId) {
      throw new BadRequestException(
        'Authenticated actor identity is required for project closure override.',
      );
    }

    const result = await this.withProjectLifecycleErrors(() =>
      this.closeProjectService.execute(id, {
        actorId,
        allowActiveAssignmentOverride: true,
        expectedProjectVersion: request.expectedProjectVersion,
        overrideReason: request.reason,
      }),
    );

    return {
      id: result.project.projectId.value,
      name: result.project.name,
      projectCode: result.project.projectCode,
      status: result.project.status,
      version: result.project.version,
      workspend: result.workspend,
    };
  }

  @Post(':id/assign-team')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Expand an org-unit team into individual project assignments while preserving per-person traceability',
  })
  @ApiOkResponse({ type: AssignProjectTeamResponseDto })
  @ApiNotFoundResponse({ description: 'Project or team org unit not found.' })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async assignTeam(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: AssignProjectTeamRequestDto,
  ): Promise<AssignProjectTeamResponseDto> {
    const result = await this.withProjectLifecycleErrors(() =>
      this.assignProjectTeamService.execute({
        actorId: request.actorId,
        allocationPercent: request.allocationPercent,
        endDate: request.endDate,
        expectedProjectVersion: request.expectedProjectVersion,
        note: request.note,
        projectId: id,
        staffingRole: request.staffingRole,
        startDate: request.startDate,
        teamOrgUnitId: request.teamOrgUnitId,
      }),
    );

    return {
      allocationPercent: result.allocationPercent,
      createdAssignments: result.createdAssignments,
      createdCount: result.createdAssignments.length,
      endDate: result.endDate,
      projectId: result.projectId,
      skippedDuplicateCount: result.skippedDuplicates.length,
      skippedDuplicates: result.skippedDuplicates,
      staffingRole: result.staffingRole,
      startDate: result.startDate,
      teamName: result.teamName,
      teamOrgUnitId: result.teamOrgUnitId,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update project metadata (name, description, status, PM, DM).' })
  @ApiOkResponse({ type: ProjectCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  @RequireRoles('project_manager', 'director', 'admin')
  public async updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateProjectRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; roles?: string[] } },
  ): Promise<ProjectCreatedResponseDto> {
    return this.mapCreatedProjectResponse(
      await this.withProjectLifecycleErrors(() =>
        this.updateProjectService.execute({
          description: request.description,
          name: request.name,
          projectId: id,
          status: request.status,
          projectManagerId: request.projectManagerId,
          deliveryManagerId: request.deliveryManagerId,
          actor: httpRequest.principal
            ? {
                personId: httpRequest.principal.personId,
                roles: httpRequest.principal.roles ?? [],
              }
            : undefined,
        }),
      ),
    );
  }

  @Get(':id/health')
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get composite health score for a project (0-100)' })
  @ApiOkResponse({ description: 'Project health score and grade.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async getProjectHealth(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectHealthDto> {
    const result = await this.projectHealthQueryService.execute(id);

    if (!result) {
      throw new NotFoundException('Project not found.');
    }

    return result;
  }

  @Get()
  @RequireRoles('employee', 'project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'List internal projects with external link summaries' })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: ProjectDirectoryResponseDto })
  public async listProjects(
    @Query() query: ProjectDirectoryQueryDto,
  ): Promise<ProjectDirectoryResponseDto> {
    return this.projectDirectoryQueryService.execute(query);
  }

  @Get(':id/dashboard')
  @RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get project dashboard: staffing, evidence by week, allocation by person' })
  @ApiQuery({ name: 'asOf', required: false, type: String })
  public async getProjectDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('asOf') asOf?: string,
  ): Promise<ProjectDashboardResponseDto> {
    try {
      return await this.projectDashboardQueryService.execute({ asOf, projectId: id });
    } catch (error) {
      if (error instanceof Error && error.message === 'Project not found.') {
        throw new NotFoundException(error.message);
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Project dashboard query failed.',
      );
    }
  }

  @Get(':id')
  @RequireRoles('employee', 'project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin')
  @ApiOperation({ summary: 'Get an internal project by id with external link details' })
  @ApiOkResponse({ type: ProjectDetailsDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async getProjectById(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetailsDto> {
    const project = await this.getProjectByIdService.execute(id);

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }

  @Get(':id/closure-readiness')
  @ApiOperation({ summary: 'Check if project is ready to close' })
  @ApiOkResponse({ description: 'Closure readiness check result.' })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async checkClosureReadiness(@Param('id', ParseUUIDPipe) id: string) {
    return this.closureReadinessService.checkClosureReadiness(id);
  }

  private mapCreatedProjectResponse(project: Project): ProjectCreatedResponseDto {
    return {
      description: project.description,
      id: project.projectId.value,
      name: project.name,
      plannedEndDate: project.endsOn?.toISOString(),
      projectCode: project.projectCode,
      projectManagerId: project.projectManagerId?.value ?? '',
      startDate: project.startsOn?.toISOString() ?? '',
      status: project.status,
      version: project.version,
    };
  }

  private async withProjectCreationErrors(work: () => Promise<Project>): Promise<Project> {
    try {
      return await work();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Project creation failed.';

      if (message === 'Project manager does not exist.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }

  private async withProjectActivationErrors(work: () => Promise<Project>): Promise<Project> {
    return this.withProjectLifecycleErrors(work);
  }

  private async withProjectLifecycleErrors<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ProjectLifecycleConflictError) {
        throw new ConflictException(error.message);
      }

      const message = error instanceof Error ? error.message : 'Project lifecycle action failed.';

      if (message === 'Project not found.' || message === 'Team org unit does not exist.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }
}
