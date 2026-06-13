import {
  BadRequestException,
  HttpException,
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
import { IsOptional, IsString } from 'class-validator';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_AUTHENTICATED_ROLES, EXEC_ROLES, PROJECT_DELIVERY_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { Idempotent } from '@src/shared/http/idempotent.decorator';
import {
  OptionalReasonBodyDto,
  RequiredReasonBodyDto,
} from '@src/shared/http/reason-body.dto';

import { ActivateProjectService } from '../application/activate-project.service';
import { DecideProjectActivationService } from '../application/decide-project-activation.service';
import { SubmitProjectForApprovalService } from '../application/submit-project-for-approval.service';
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
import { ProjectTimeToFillDto, TimeToFillService } from '../application/time-to-fill.service';
import { UpdateProjectService } from '../application/update-project.service';
import { Project, ProjectStatus } from '../domain/entities/project.entity';

class UpdateProjectRequestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  projectManagerId?: string;

  @IsOptional()
  @IsString()
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
    private readonly submitProjectForApprovalService: SubmitProjectForApprovalService,
    private readonly decideProjectActivationService: DecideProjectActivationService,
    private readonly closeProjectService: CloseProjectService,
    private readonly assignProjectTeamService: AssignProjectTeamService,
    private readonly updateProjectService: UpdateProjectService,
    private readonly projectHealthQueryService: ProjectHealthQueryService,
    private readonly closureReadinessService: ProjectClosureReadinessService,
    private readonly timeToFillService: TimeToFillService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
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
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  @ApiOperation({ summary: 'Activate a draft internal project (legacy direct path; HD-2 prefers /submit-for-approval → /approve)' })
  @ApiOkResponse({ type: ProjectCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async activateProject(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectCreatedResponseDto> {
    return this.mapCreatedProjectResponse(
      await this.withProjectActivationErrors(() => this.activateProjectService.execute(id)),
    );
  }

  @Post(':id/submit-for-approval')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('project_manager', 'delivery_manager', 'admin')
  @Idempotent()
  @ApiOperation({ summary: 'HD-2 — submit a DRAFT project for Director approval (DRAFT → PENDING_APPROVAL)' })
  @ApiOkResponse({ type: ProjectCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async submitProjectForApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OptionalReasonBodyDto | undefined,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<ProjectCreatedResponseDto> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const result = await this.withProjectActivationErrors(() =>
      this.submitProjectForApprovalService
        .execute({ actorId, projectId: id, reason: body?.reason })
        .then((r) => r.project),
    );
    return this.mapCreatedProjectResponse(result);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...EXEC_ROLES)
  @Idempotent()
  @ApiOperation({ summary: 'HD-2 — Director approves a PENDING_APPROVAL project (PENDING_APPROVAL → ACTIVE)' })
  @ApiOkResponse({ type: ProjectCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async approveProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: OptionalReasonBodyDto | undefined,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<ProjectCreatedResponseDto> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const result = await this.withProjectActivationErrors(() =>
      this.decideProjectActivationService
        .execute({ actorId, projectId: id, decision: 'APPROVE', reason: body?.reason })
        .then((r) => r.project),
    );
    return this.mapCreatedProjectResponse(result);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({ summary: 'HD-2 — Director rejects a PENDING_APPROVAL project (PENDING_APPROVAL → DRAFT). Reason required.' })
  @ApiOkResponse({ type: ProjectCreatedResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async rejectProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RequiredReasonBodyDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<ProjectCreatedResponseDto> {
    const actorId =
      httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const result = await this.withProjectActivationErrors(() =>
      this.decideProjectActivationService
        .execute({ actorId, projectId: id, decision: 'REJECT', reason: body?.reason })
        .then((r) => r.project),
    );
    return this.mapCreatedProjectResponse(result);
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
      ...(result.undoActionId ? { undoActionId: result.undoActionId } : {}),
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
  @RequireRoles(...EXEC_ROLES)
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
  @RequireRoles(...STAFFING_ROLES)
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

  /**
   * Sprint F-0.8 (B-14 / D-88) — batch variant of /:id/health. Replaces the
   * N+1 pattern where the FE projects list (and several dashboards) fired one
   * health request per visible project (30+ requests per page load on /projects
   * with a default-sized seed). Returns a map of `{ projectId → health }`;
   * unknown ids are simply omitted from the response.
   */
  @Get('health')
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({
    summary: 'Batch project health for a list of project ids (replaces N+1 calls)',
  })
  @ApiQuery({
    name: 'ids',
    required: true,
    description: 'Comma-separated UUIDs (max 200).',
    type: String,
  })
  @ApiOkResponse({
    description: 'Object keyed by projectId; missing ids are omitted.',
  })
  public async getProjectHealthBatch(
    @Query('ids') idsParam?: string,
  ): Promise<Record<string, ProjectHealthDto>> {
    if (!idsParam) return {};
    const ids = idsParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 200);
    const map = await this.projectHealthQueryService.executeMany(ids);
    const out: Record<string, ProjectHealthDto> = {};
    map.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }

  @Get()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
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
  @RequireRoles(...STAFFING_ROLES)
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
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
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

  @Get(':id/metrics/time-to-fill')
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({
    summary:
      'LEAN-P4b-1 — per-position time-to-fill (OPENED → BOOKED) plus median across all positions',
  })
  @ApiOkResponse({ description: 'Time-to-fill metric for the project.' })
  @ApiNotFoundResponse({ description: 'Project not found.' })
  public async getProjectTimeToFill(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectTimeToFillDto> {
    const project = await this.getProjectByIdService.execute(id);
    if (!project) {
      throw new NotFoundException('Project not found.');
    }
    return this.timeToFillService.execute(id);
  }

  @Get(':id/closure-readiness')
  @ApiOperation({ summary: 'Check if project is ready to close' })
  @ApiOkResponse({ description: 'Closure readiness check result.' })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
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

      // HD-4 — Pass typed HTTP errors through untouched so the resolver's
      // ForbiddenException (PERSON-mode mismatch) keeps its 403 status
      // instead of getting flattened to 400. Same for any service that
      // throws e.g. NotFoundException directly.
      if (error instanceof HttpException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Project lifecycle action failed.';

      if (message === 'Project not found.' || message === 'Team org unit does not exist.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }
}
