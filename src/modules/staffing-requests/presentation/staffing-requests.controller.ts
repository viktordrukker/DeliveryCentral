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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  AggregateType,
  ParsePublicIdOrUuid,
} from '@src/infrastructure/public-id';

import {
  DeriveStaffingRequestStatusService,
  DerivedStaffingRequestResult,
} from '../application/derive-staffing-request-status.service';
import {
  SuggestionCandidate,
  SkillRequirement,
  StaffingSuggestionsService,
} from '../application/staffing-suggestions.service';
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
  ) {}

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
}
