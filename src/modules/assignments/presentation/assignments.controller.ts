import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  NotFoundException,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { ActivateApprovedAssignmentsService } from '../application/activate-approved-assignments.service';
import { ApproveProjectAssignmentService } from '../application/approve-project-assignment.service';
import { BulkCreateProjectAssignmentsService } from '../application/bulk-create-project-assignments.service';
import { AssignmentDecisionRequestDto } from '../application/contracts/assignment-decision.request';
import {
  AssignmentDetailsDto,
  AssignmentDirectoryResponseDto,
} from '../application/contracts/assignment-directory.dto';
import { AssignmentDirectoryQueryDto } from '../application/contracts/assignment-directory.query';
import {
  BulkProjectAssignmentRequestDto,
} from '../application/contracts/bulk-project-assignment.request';
import {
  BulkProjectAssignmentResponseDto,
} from '../application/contracts/bulk-project-assignment.response';
import { CreateProjectAssignmentRequestDto } from '../application/contracts/create-project-assignment.request';
import { CreateProjectAssignmentOverrideRequestDto } from '../application/contracts/create-project-assignment-override.request';
import { EndProjectAssignmentRequestDto } from '../application/contracts/end-project-assignment.request';
import { ProjectAssignmentResponseDto } from '../application/contracts/project-assignment.response';
import { CreateProjectAssignmentService } from '../application/create-project-assignment.service';
import { EndProjectAssignmentService } from '../application/end-project-assignment.service';
import { GetAssignmentByIdService } from '../application/get-assignment-by-id.service';
import { ListAssignmentsService } from '../application/list-assignments.service';
import { RejectProjectAssignmentService } from '../application/reject-project-assignment.service';
import { AmendProjectAssignmentService } from '../application/amend-project-assignment.service';
import { RevokeProjectAssignmentService } from '../application/revoke-project-assignment.service';
import { TransitionProjectAssignmentService } from '../application/transition-project-assignment.service';
import { AssignmentConcurrencyConflictError } from '../application/assignment-concurrency-conflict.error';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { AssignmentStatusValue } from '../domain/value-objects/assignment-status';
import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

class AmendAssignmentRequestDto {
  allocationPercent?: number;
  notes?: string;
  staffingRole?: string;
  validTo?: string;
}

class RevokeAssignmentRequestDto {
  reason?: string;
}

class TransitionRequestDto {
  caseId?: string;
  reason?: string;
}

@ApiTags('assignments')
@Controller('assignments')
export class AssignmentsController {
  public constructor(
    private readonly activateApprovedAssignmentsService: ActivateApprovedAssignmentsService,
    private readonly createProjectAssignmentService: CreateProjectAssignmentService,
    private readonly bulkCreateProjectAssignmentsService: BulkCreateProjectAssignmentsService,
    private readonly approveProjectAssignmentService: ApproveProjectAssignmentService,
    private readonly rejectProjectAssignmentService: RejectProjectAssignmentService,
    private readonly endProjectAssignmentService: EndProjectAssignmentService,
    private readonly listAssignmentsService: ListAssignmentsService,
    private readonly getAssignmentByIdService: GetAssignmentByIdService,
    private readonly amendProjectAssignmentService: AmendProjectAssignmentService,
    private readonly revokeProjectAssignmentService: RevokeProjectAssignmentService,
    private readonly transitionProjectAssignmentService: TransitionProjectAssignmentService,
  ) {}

  @Post('activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate all approved assignments that have reached their start date' })
  @ApiOkResponse({ description: 'Number of assignments activated.' })
  @RequireRoles('admin', 'resource_manager', 'director')
  public async activateApproved(): Promise<{ activated: number }> {
    const activated = await this.activateApprovedAssignmentsService.execute();
    return { activated };
  }

  @Get()
  @ApiOperation({ summary: 'List authoritative internal project assignments' })
  @ApiOkResponse({ type: AssignmentDirectoryResponseDto })
  @RequireRoles('employee', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async listAssignments(
    @Query() query: AssignmentDirectoryQueryDto,
  ): Promise<AssignmentDirectoryResponseDto> {
    return this.listAssignmentsService.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get authoritative internal project assignment by id' })
  @ApiOkResponse({ type: AssignmentDetailsDto })
  @RequireRoles('employee', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getAssignmentById(@Param('id', ParseUUIDPipe) id: string): Promise<AssignmentDetailsDto> {
    const assignment = await this.getAssignmentByIdService.execute(id);

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    return assignment;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a formal internal project assignment' })
  @ApiCreatedResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async createAssignment(
    @Body() request: CreateProjectAssignmentRequestDto,
  ): Promise<ProjectAssignmentResponseDto> {
    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.createProjectAssignmentService.execute(request),
      ),
    );
  }

  @Post('override')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create an assignment through an explicit governance override for selected staffing conflicts',
  })
  @ApiCreatedResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('director', 'admin')
  public async createAssignmentOverride(
    @Body() request: CreateProjectAssignmentOverrideRequestDto,
    @Req() httpRequest: { principal?: RequestPrincipal },
  ): Promise<ProjectAssignmentResponseDto> {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId;

    if (!actorId || !this.isUuid(actorId)) {
      throw new BadRequestException(
        'Authenticated actor identity is required for assignment override.',
      );
    }

    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.createProjectAssignmentService.execute({
          actorId,
          allocationPercent: request.allocationPercent,
          allowOverlapOverride: true,
          endDate: request.endDate,
          note: request.note,
          overrideReason: request.reason,
          personId: request.personId,
          projectId: request.projectId,
          staffingRole: request.staffingRole,
          startDate: request.startDate,
        }),
      ),
    );
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Create multiple formal internal project assignments using explicit partial-success results',
  })
  @ApiOkResponse({ type: BulkProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async bulkCreateAssignments(
    @Body() request: BulkProjectAssignmentRequestDto,
  ): Promise<BulkProjectAssignmentResponseDto> {
    try {
      const result = await this.bulkCreateProjectAssignmentsService.execute(request);

      return {
        createdCount: result.createdCount,
        createdItems: await Promise.all(
          result.createdItems.map(async (item) => {
            const assignment = await this.getAssignmentByIdService.execute(item.assignmentId);
            if (!assignment) {
              throw new Error('Assignment not found after bulk creation.');
            }

            return {
              assignment: {
                allocationPercent: assignment.allocationPercent,
                endDate: assignment.endDate ?? undefined,
                id: assignment.id,
                note: assignment.note,
                personId: assignment.person.id,
                projectId: assignment.project.id,
                requestedAt: assignment.requestedAt,
                staffingRole: assignment.staffingRole,
                startDate: assignment.startDate,
                status: assignment.approvalState,
                version: assignment.version,
              },
              index: item.index,
            };
          }),
        ),
        failedCount: result.failedCount,
        failedItems: result.failedItems,
        message: result.message,
        strategy: result.strategy,
        totalCount: result.totalCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk assignment action failed.';
      throw new BadRequestException(message);
    }
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a requested project assignment' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async approveAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: AssignmentDecisionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<ProjectAssignmentResponseDto> {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.approveProjectAssignmentService.execute({
          actorId,
          assignmentId: id,
          comment: request.comment,
        }),
      ),
    );
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a requested project assignment' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async rejectAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: AssignmentDecisionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<ProjectAssignmentResponseDto> {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.rejectProjectAssignmentService.execute({
          actorId,
          assignmentId: id,
          reason: request.reason ?? request.comment,
        }),
      ),
    );
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an approved or active project assignment' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async endAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: EndProjectAssignmentRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string } },
  ): Promise<ProjectAssignmentResponseDto> {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.endProjectAssignmentService.execute({
          actorId,
          assignmentId: id,
          endDate: request.endDate,
          reason: request.reason,
        }),
      ),
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Amend an active or approved project assignment' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Assignment not found' })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async amendAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: AmendAssignmentRequestDto,
  ): Promise<ProjectAssignmentResponseDto> {
    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.amendProjectAssignmentService.execute({
          allocationPercent: request.allocationPercent,
          assignmentId: id,
          notes: request.notes,
          staffingRole: request.staffingRole,
          validTo: request.validTo,
        }),
      ),
    );
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an assignment, removing it from active staffing' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @ApiNotFoundResponse({ description: 'Assignment not found' })
  @RequireRoles('project_manager', 'resource_manager', 'director', 'admin')
  public async revokeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: RevokeAssignmentRequestDto,
  ): Promise<ProjectAssignmentResponseDto> {
    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.revokeProjectAssignmentService.execute({
          assignmentId: id,
          reason: request.reason,
        }),
      ),
    );
  }

  @Post(':id/propose')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propose a candidate for a created staffing slot' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('resource_manager', 'delivery_manager', 'admin')
  public async proposeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('PROPOSED', id, request, httpRequest);
  }

  @Post(':id/book')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Book a proposed assignment after validating workload' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async bookAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('BOOKED', id, request, httpRequest);
  }

  @Post(':id/onboarding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a booked assignment to onboarding' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async onboardingAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('ONBOARDING', id, request, httpRequest);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an assignment as actively assigned (work started)' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async assignAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('ASSIGNED', id, request, httpRequest);
  }

  @Post(':id/hold')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Place an assignment on hold (escalation, case, or incident)' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'resource_manager', 'hr_manager', 'director', 'admin')
  public async holdAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('ON_HOLD', id, request, httpRequest);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release an on-hold assignment back to assigned' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'resource_manager', 'hr_manager', 'director', 'admin')
  public async releaseAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('ASSIGNED', id, request, httpRequest);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an assignment as completed (natural end of work)' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async completeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('COMPLETED', id, request, httpRequest);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an assignment' })
  @ApiOkResponse({ type: ProjectAssignmentResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'resource_manager', 'director', 'admin')
  public async cancelAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: TransitionRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    return this.runTransition('CANCELLED', id, request, httpRequest);
  }

  private async runTransition(
    target: AssignmentStatusValue,
    id: string,
    request: TransitionRequestDto,
    httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProjectAssignmentResponseDto> {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const actorRoles = (httpRequest.principal?.roles ?? []) as PlatformRole[];
    return this.mapAssignmentResponse(
      await this.withAssignmentErrors(() =>
        this.transitionProjectAssignmentService.execute({
          actorId,
          actorRoles,
          assignmentId: id,
          caseId: request.caseId,
          reason: request.reason,
          target,
        }),
      ),
    );
  }

  private mapAssignmentResponse(assignment: ProjectAssignment): ProjectAssignmentResponseDto {
    return {
      allocationPercent: assignment.allocationPercent?.value ?? 0,
      endDate: assignment.validTo?.toISOString(),
      id: assignment.assignmentId.value,
      note: assignment.notes,
      personId: assignment.personId,
      projectId: assignment.projectId,
      requestedAt: assignment.requestedAt.toISOString(),
      staffingRole: assignment.staffingRole,
      startDate: assignment.validFrom.toISOString(),
      status: assignment.status.value,
      version: assignment.version,
    };
  }

  private async withAssignmentErrors(
    work: () => Promise<ProjectAssignment>,
  ): Promise<ProjectAssignment> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof AssignmentConcurrencyConflictError) {
        throw new ConflictException(error.message);
      }

      const message = error instanceof Error ? error.message : 'Assignment action failed.';

      if (
        message === 'Person does not exist.' ||
        message === 'Project does not exist.' ||
        message === 'Assignment not found.'
      ) {
        throw new NotFoundException(message);
      }

      // Do not expose internal Prisma error details to clients.
      const isPrismaError =
        error != null &&
        typeof error === 'object' &&
        'constructor' in error &&
        (error.constructor.name === 'PrismaClientKnownRequestError' ||
          error.constructor.name === 'PrismaClientUnknownRequestError' ||
          error.constructor.name === 'PrismaClientValidationError');

      throw new BadRequestException(isPrismaError ? 'Assignment action failed.' : message);
    }
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
