import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
  ApiTags,
} from '@nestjs/swagger';
import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  AggregateType,
  ParsePublicIdOrUuid,
} from '@src/infrastructure/public-id';

import {
  PickProposalCandidateRequestDto,
  PickProposalCandidateResponseDto,
  ProposalSlateResponseDto,
  RejectProposalSlateRequestDto,
  RejectProposalSlateResponseDto,
  SubmitProposalSlateRequestDto,
} from '../application/contracts/proposal-slate.dto';
import {
  DeriveStaffingRequestStatusService,
  DerivedStaffingRequestResult,
} from '../application/derive-staffing-request-status.service';
import { StaffingProposalSlateService } from '../application/staffing-proposal-slate.service';
import {
  SuggestionCandidate,
  SkillRequirement,
  StaffingSuggestionsService,
} from '../application/staffing-suggestions.service';
import { StaffingRequestProposalSlate } from '../domain/entities/staffing-request-proposal-slate.entity';
import {
  InMemoryStaffingRequestService,
  StaffingRequest,
  StaffingRequestPriority,
  StaffingRequestStatus,
} from '../infrastructure/services/in-memory-staffing-request.service';

export interface StaffingRequestWithDerived extends StaffingRequest {
  derivedStatus: DerivedStaffingRequestResult['derivedStatus'];
  assignmentSummary: DerivedStaffingRequestResult['summary'];
}

interface CreateStaffingRequestBody {
  allocationPercent: number;
  candidatePersonId?: string;
  endDate: string;
  headcountRequired?: number;
  priority: StaffingRequestPriority;
  projectId: string;
  requestedByPersonId: string;
  role: string;
  skills?: string[];
  startDate: string;
  summary?: string;
}

interface UpdateStaffingRequestBody {
  allocationPercent?: number;
  endDate?: string;
  headcountRequired?: number;
  priority?: StaffingRequestPriority;
  role?: string;
  skills?: string[];
  startDate?: string;
  summary?: string;
}

interface FulfilBody {
  assignedPersonId: string;
  proposedByPersonId: string;
}

@ApiTags('staffing-requests')
@Controller('staffing-requests')
@RequireRoles('project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
export class StaffingRequestsController {
  public constructor(
    private readonly service: InMemoryStaffingRequestService,
    private readonly suggestionsService: StaffingSuggestionsService,
    private readonly deriveStatusService: DeriveStaffingRequestStatusService,
    private readonly proposalSlateService: StaffingProposalSlateService,
  ) {}

  private mapSlateResponse(slate: StaffingRequestProposalSlate): ProposalSlateResponseDto {
    return {
      id: slate.id,
      staffingRequestId: slate.staffingRequestId,
      proposedByPersonId: slate.proposedByPersonId,
      status: slate.status,
      proposedAt: slate.proposedAt.toISOString(),
      expiresAt: slate.expiresAt?.toISOString(),
      decidedAt: slate.decidedAt?.toISOString(),
      candidates: slate.candidates.map((c) => ({
        id: c.id,
        candidatePersonId: c.candidatePersonId,
        rank: c.rank,
        matchScore: c.matchScore,
        availabilityPercent: c.availabilityPercent,
        mismatchedSkills: [...c.mismatchedSkills],
        rationale: c.rationale,
        decision: c.decision,
        decidedAt: c.decidedAt?.toISOString(),
      })),
    };
  }

  private async enrich(request: StaffingRequest): Promise<StaffingRequestWithDerived> {
    const derived = await this.deriveStatusService.deriveForRequest(
      request.id,
      request.headcountRequired ?? 1,
    );
    return {
      ...request,
      assignmentSummary: derived.summary,
      derivedStatus: derived.derivedStatus,
    };
  }

  private async enrichMany(requests: StaffingRequest[]): Promise<StaffingRequestWithDerived[]> {
    if (requests.length === 0) return [];
    const ids = requests.map((request) => request.id);
    const derivedByRequest = await this.deriveStatusService.deriveForRequests(ids);
    return requests.map((request) => {
      const derived = derivedByRequest.get(request.id);
      return {
        ...request,
        assignmentSummary:
          derived?.summary ?? {
            assigned: 0,
            booked: 0,
            cancelled: 0,
            completed: 0,
            created: 0,
            onHold: 0,
            onboarding: 0,
            proposed: 0,
            rejected: 0,
            totalAssignments: 0,
          },
        derivedStatus: derived?.derivedStatus ?? 'Open',
      };
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a staffing request' })
  @ApiCreatedResponse({ description: 'Staffing request created' })
  public async create(@Body() body: CreateStaffingRequestBody): Promise<StaffingRequestWithDerived> {
    try {
      const created = await this.service.create(body);
      return this.enrich(created);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Creation failed.');
    }
  }

  @Get()
  @ApiOperation({ summary: 'List staffing requests' })
  @ApiOkResponse({ description: 'Staffing requests list' })
  public async list(
    @Query('status') status?: StaffingRequestStatus,
    @Query('projectId') projectId?: string,
    @Query('priority') priority?: StaffingRequestPriority,
    @Query('requestedByPersonId') requestedByPersonId?: string,
  ): Promise<StaffingRequestWithDerived[]> {
    const rows = await this.service.list({ priority, projectId, requestedByPersonId, status });
    return this.enrichMany(rows);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get ranked candidate suggestions for a staffing request' })
  @ApiOkResponse({ description: 'Ranked candidates with weighted skill scores' })
  public async getSuggestions(
    @Query('requestId') requestId: string,
    @Query('skills') skillsParam?: string,
    @Query('importance') importanceParam?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('allocationPercent') allocationPercent?: string,
  ): Promise<SuggestionCandidate[]> {
    // Parse skills from query params or from the stored request
    let skills: SkillRequirement[] = [];

    if (requestId) {
      const request = await this.service.getById(requestId);
      if (request) {
        skills = request.skills.map((s) => ({
          importance: 'REQUIRED' as const,
          skillName: s,
        }));
        return this.suggestionsService.suggest({
          allocationPercent: request.allocationPercent,
          endDate: request.endDate,
          skills,
          startDate: request.startDate,
        });
      }
    }

    if (skillsParam) {
      const skillNames = skillsParam.split(',').map((s) => s.trim()).filter(Boolean);
      const importances = importanceParam ? importanceParam.split(',') : [];
      skills = skillNames.map((name, idx) => ({
        importance: (importances[idx] as SkillRequirement['importance']) ?? 'REQUIRED',
        skillName: name,
      }));
    }

    return this.suggestionsService.suggest({
      allocationPercent: Number(allocationPercent ?? 100),
      endDate: endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      skills,
      startDate: startDate ?? new Date().toISOString().slice(0, 10),
    });
  }

  // DM-2.5-8-staffing Sub-B: every :id param accepts either uuid (legacy)
  // or `stf_…` publicId via the transitional pipe. The service layer's
  // `findRecordByIdOrPublicId` resolves both shapes. Flip to strict
  // `ParsePublicId` in Sub-C once frontend routes stop emitting UUIDs.
  @Get(':id')
  @ApiOperation({ summary: 'Get staffing request by id or publicId' })
  @ApiOkResponse({ description: 'Staffing request' })
  @ApiNotFoundResponse({ description: 'Not found.' })
  public async getById(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
  ): Promise<StaffingRequestWithDerived> {
    const request = await this.service.getById(id);
    if (!request) throw new NotFoundException('Staffing request not found.');
    return this.enrich(request);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a DRAFT staffing request' })
  @ApiOkResponse({ description: 'Updated' })
  public async update(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
    @Body() body: UpdateStaffingRequestBody,
  ): Promise<StaffingRequestWithDerived> {
    try {
      const updated = await this.service.update(id, body);
      return this.enrich(updated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Update failed.';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a DRAFT request (→ OPEN)' })
  @ApiOkResponse({ description: 'Submitted' })
  public async submit(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
  ): Promise<StaffingRequestWithDerived> {
    try {
      const result = await this.service.submit(id);
      return this.enrich(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Submit failed.';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Take an OPEN request into IN_REVIEW' })
  @ApiOkResponse({ description: 'Under review' })
  public async review(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
  ): Promise<StaffingRequestWithDerived> {
    try {
      const result = await this.service.review(id);
      return this.enrich(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Review failed.';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release an IN_REVIEW request back to OPEN' })
  @ApiOkResponse({ description: 'Released' })
  public async release(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
  ): Promise<StaffingRequestWithDerived> {
    try {
      const result = await this.service.release(id);
      return this.enrich(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Release failed.';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post(':id/fulfil')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fulfil a staffing request by assigning a person' })
  @ApiOkResponse({ description: 'Fulfilment recorded' })
  public async fulfil(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
    @Body() body: FulfilBody,
  ): Promise<StaffingRequestWithDerived> {
    try {
      const result = await this.service.fulfil(id, body.proposedByPersonId, body.assignedPersonId);
      return this.enrich(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fulfilment failed.';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a staffing request' })
  @ApiOkResponse({ description: 'Cancelled' })
  public async cancel(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
  ): Promise<StaffingRequestWithDerived> {
    try {
      const result = await this.service.cancel(id);
      return this.enrich(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Cancel failed.';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Duplicate a staffing request — creates a fresh DRAFT with the same fields (1 request = 1 person)',
  })
  @ApiCreatedResponse({ description: 'Duplicated draft created' })
  public async duplicate(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
  ): Promise<StaffingRequestWithDerived> {
    try {
      const result = await this.service.duplicate(id);
      return this.enrich(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Duplicate failed.';
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  // ─── Proposal slate endpoints ─────────────────────────────────────────────
  // The slate aggregate lives on the StaffingRequest. PM creates the request →
  // RM proposes a slate → PM picks; the assignment is born at pick-time with
  // the picked person already in BOOKED.

  @Get(':id/proposals')
  @ApiOperation({ summary: 'Fetch the active proposal slate for this staffing request (or null)' })
  @ApiOkResponse({ type: ProposalSlateResponseDto })
  @RequireRoles('employee', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin')
  public async getProposalSlate(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
  ): Promise<ProposalSlateResponseDto | null> {
    const slate = await this.proposalSlateService.findByStaffingRequestId(id);
    return slate ? this.mapSlateResponse(slate) : null;
  }

  @Post(':id/proposals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a multi-candidate proposal slate (RM)' })
  @ApiCreatedResponse({ type: ProposalSlateResponseDto })
  @RequireRoles('resource_manager', 'delivery_manager', 'admin')
  public async submitProposalSlate(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
    @Body() request: SubmitProposalSlateRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProposalSlateResponseDto> {
    if (!Array.isArray(request.candidates) || request.candidates.length === 0) {
      throw new BadRequestException('candidates must be a non-empty array.');
    }
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const actorRoles = (httpRequest.principal?.roles ?? []) as PlatformRole[];
    const slate = await this.proposalSlateService.submit({
      actorId,
      actorRoles,
      staffingRequestId: id,
      candidates: request.candidates.map((c) => ({
        candidatePersonId: c.candidatePersonId,
        rank: c.rank,
        matchScore: c.matchScore,
        availabilityPercent: c.availabilityPercent,
        mismatchedSkills: c.mismatchedSkills,
        rationale: c.rationale,
      })),
      expiresAt: request.expiresAt ? new Date(request.expiresAt) : undefined,
    });
    return this.mapSlateResponse(slate);
  }

  @Post(':id/proposals/:slateId/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge proposal slate (PM/DM); request → IN_REVIEW (idempotent)' })
  @ApiOkResponse({ type: ProposalSlateResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async acknowledgeProposal(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
    @Param('slateId') slateId: string,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<ProposalSlateResponseDto> {
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const actorRoles = (httpRequest.principal?.roles ?? []) as PlatformRole[];
    const slate = await this.proposalSlateService.acknowledge({
      actorId,
      actorRoles,
      staffingRequestId: id,
      slateId,
    });
    return this.mapSlateResponse(slate);
  }

  @Post(':id/proposals/:slateId/pick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pick a candidate; creates an Assignment at BOOKED' })
  @ApiOkResponse({ type: PickProposalCandidateResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async pickProposalCandidate(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
    @Param('slateId') slateId: string,
    @Body() body: PickProposalCandidateRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<PickProposalCandidateResponseDto> {
    if (!body?.candidateId?.trim()) {
      throw new BadRequestException('candidateId is required.');
    }
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const actorRoles = (httpRequest.principal?.roles ?? []) as PlatformRole[];
    const result = await this.proposalSlateService.pickCandidate({
      actorId,
      actorRoles,
      staffingRequestId: id,
      slateId,
      candidateId: body.candidateId,
    });
    return { assignmentId: result.assignmentId, slate: this.mapSlateResponse(result.slate) };
  }

  @Post(':id/proposals/:slateId/reject-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject the slate; sendBack=true returns to OPEN, false → CANCELLED' })
  @ApiOkResponse({ type: RejectProposalSlateResponseDto })
  @RequireRoles('project_manager', 'delivery_manager', 'director', 'admin')
  public async rejectProposalSlate(
    @Param('id', ParsePublicIdOrUuid(AggregateType.StaffingRequest)) id: string,
    @Param('slateId') slateId: string,
    @Body() body: RejectProposalSlateRequestDto,
    @Req() httpRequest: { principal?: { personId?: string; userId?: string; roles?: PlatformRole[] } },
  ): Promise<RejectProposalSlateResponseDto> {
    if (!body?.reasonCode?.trim()) {
      throw new BadRequestException('reasonCode is required.');
    }
    const actorId = httpRequest.principal?.personId ?? httpRequest.principal?.userId ?? 'unknown';
    const actorRoles = (httpRequest.principal?.roles ?? []) as PlatformRole[];
    const result = await this.proposalSlateService.rejectAll({
      actorId,
      actorRoles,
      staffingRequestId: id,
      slateId,
      reasonCode: body.reasonCode,
      reason: body.reason,
      sendBack: Boolean(body.sendBack),
    });
    return { slate: this.mapSlateResponse(result.slate), nextRequestStatus: result.nextRequestStatus };
  }
}
