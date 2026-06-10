import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AggregateType, ParsePublicIdOrUuid } from '@src/infrastructure/public-id';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import {
  ALL_AUTHENTICATED_ROLES,
  PROJECT_DELIVERY_ROLES,
  STAFFING_ROLES,
} from '@src/shared/auth/role-presets';

import {
  BenchCheckRequestDto,
  BulkReassignPositionsRequestDto,
  BulkReassignPositionsResponseDto,
  CreateProjectPositionRequestDto,
  ListProjectPositionsQueryDto,
  TransitionProjectPositionFillRequestDto,
} from '../application/contracts/project-position-requests';
import {
  BenchCheckResponseDto,
  ListProjectPositionsResponseDto,
  ProjectPositionResponseDto,
} from '../application/contracts/project-position-responses';
import { BulkReassignPositionsService } from '../application/bulk-reassign-positions.service';
import { PositionCandidatesResponseDto } from '../application/contracts/position-candidate.dto';
import { PersonSuggestedPositionsResponseDto } from '../application/contracts/person-suggested-position.dto';
import { BenchEnrichedRowDto } from '../application/contracts/bench-enriched.dto';
import { CreateProjectPositionService } from '../application/create-project-position.service';
import { GetProjectPositionByIdService } from '../application/get-project-position-by-id.service';
import { ListBenchPeopleService } from '../application/list-bench-people.service';
import { ListEnrichedBenchService } from '../application/list-enriched-bench.service';
import {
  ListPositionHistoryService,
  PositionHistoryResponseDto,
} from '../application/list-position-history.service';
import { ListProjectPositionsService } from '../application/list-project-positions.service';
import {
  PositionForensicsDto,
  PositionForensicsService,
} from '../application/position-forensics.service';
import { SuggestFillsService } from '../application/suggest-fills.service';
import { TransitionProjectPositionFillService } from '../application/transition-project-position-fill.service';
import { PositionDomainExceptionFilter } from './position-domain-exception.filter';

interface RequestWithPrincipal extends Request {
  principal?: RequestPrincipal;
}

/**
 * Sprint 2 / S2-4 — REST surface for the lean staffing aggregate.
 *
 * Endpoints (all under `/api`):
 *   GET    /project-positions                 list (filterable, paginated)
 *   GET    /project-positions/:id             detail
 *   POST   /project-positions                 create
 *   POST   /project-positions/:id/transition  apply fill-status transition
 *
 * Bench-side endpoint is exposed under `/people/bench` in a sibling controller
 * (see `PeopleBenchController`) so the URL contract reads naturally from the
 * Person side.
 */
@ApiTags('project-positions')
@Controller('project-positions')
@UseFilters(PositionDomainExceptionFilter)
export class ProjectPositionsController {
  public constructor(
    private readonly createService: CreateProjectPositionService,
    private readonly transitionService: TransitionProjectPositionFillService,
    private readonly listService: ListProjectPositionsService,
    private readonly getService: GetProjectPositionByIdService,
    private readonly suggestFillsService: SuggestFillsService,
    private readonly forensicsService: PositionForensicsService,
    private readonly historyService: ListPositionHistoryService,
    private readonly bulkReassignService: BulkReassignPositionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List project positions with filters + pagination' })
  @ApiOkResponse({ type: ListProjectPositionsResponseDto })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async list(
    @Query() query: ListProjectPositionsQueryDto,
  ): Promise<ListProjectPositionsResponseDto> {
    const result = await this.listService.execute({
      projectId: query.projectId,
      activePersonId: query.activePersonId,
      fillStatuses: query.fillStatuses,
      asOf: query.asOf ? new Date(query.asOf) : undefined,
      skip: query.skip,
      take: query.take,
    });
    return {
      positions: result.positions.map((p) => ProjectPositionResponseDto.from(p)),
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project position by id or publicId' })
  @ApiOkResponse({ type: ProjectPositionResponseDto })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async getById(
    // W1-11 transitional pipe — accepts both legacy uuid and `pos_…` publicId
    // so the FE can flip URLs incrementally. Flip to strict ParsePublicId
    // once all deep-link emitters have shipped.
    @Param('id', ParsePublicIdOrUuid(AggregateType.ProjectPosition)) id: string,
  ): Promise<ProjectPositionResponseDto> {
    const position = await this.getService.execute(id);
    return ProjectPositionResponseDto.from(position);
  }

  @Get(':id/forensics')
  @ApiOperation({
    summary:
      'LEAN-P4b-2 — full ProjectPositionFillHistory timeline annotated with per-event dwell-time (OPEN > 7d / PROPOSED > 3d flagged as longDwell).',
  })
  @ApiOkResponse({ description: 'Position lifecycle forensics.' })
  @ApiNotFoundResponse({ description: 'Position not found.' })
  @RequireRoles(...STAFFING_ROLES)
  public async forensics(
    @Param('id', ParsePublicIdOrUuid(AggregateType.ProjectPosition)) id: string,
  ): Promise<PositionForensicsDto> {
    return this.forensicsService.execute(id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary:
      'W2-04 — lean ProjectPositionFillHistory ledger ordered oldest-first. ' +
      'Lighter than `/forensics` (no dwell-time computation); used by the ' +
      'position detail page lifecycle timeline.',
  })
  @ApiOkResponse({ description: 'Position lifecycle history.' })
  @ApiNotFoundResponse({ description: 'Position not found.' })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async history(
    @Param('id', ParsePublicIdOrUuid(AggregateType.ProjectPosition)) id: string,
  ): Promise<PositionHistoryResponseDto> {
    return this.historyService.execute(id);
  }

  @Get(':id/candidates')
  @ApiOperation({
    summary:
      'NEW-LGL-7 — ranked suggested fills for an open position (skill+role match off bench).',
  })
  @ApiOkResponse({ type: PositionCandidatesResponseDto })
  @RequireRoles(...STAFFING_ROLES)
  public async candidates(
    @Param('id', ParsePublicIdOrUuid(AggregateType.ProjectPosition)) id: string,
    @Query('limit') limit?: string,
  ): Promise<PositionCandidatesResponseDto> {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    const take = parsed && Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : undefined;
    return this.suggestFillsService.suggestForPosition(id, take);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project position (demand record)' })
  @ApiCreatedResponse({ type: ProjectPositionResponseDto })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async create(
    @Body() body: CreateProjectPositionRequestDto,
    @Req() request: RequestWithPrincipal,
  ): Promise<ProjectPositionResponseDto> {
    const actorId = request.principal?.personId ?? request.principal?.userId ?? '';
    const position = await this.createService.execute({
      actorId,
      projectId: body.projectId,
      role: body.role,
      requiredAllocationPercent: body.requiredAllocationPercent,
      startDate: body.startDate,
      endDate: body.endDate,
      skills: body.skills,
      summary: body.summary,
      requestedByPersonId: body.requestedByPersonId,
      openImmediately: body.openImmediately,
    });
    return ProjectPositionResponseDto.from(position);
  }

  @Post('bulk-reassign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'LEAN-P4-missing-1 — PM bulk reassign of project positions. Updates ' +
      'activePersonId and/or projectId for the listed positions inside a ' +
      'single prisma.$transaction. Any single failure rolls the batch back.',
  })
  @ApiOkResponse({ type: BulkReassignPositionsResponseDto })
  @RequireRoles(...PROJECT_DELIVERY_ROLES)
  public async bulkReassign(
    @Body() body: BulkReassignPositionsRequestDto,
    @Req() request: RequestWithPrincipal,
  ): Promise<BulkReassignPositionsResponseDto> {
    const actorId = request.principal?.personId ?? request.principal?.userId ?? '';
    const actorRoles = request.principal?.roles ?? [];
    return this.bulkReassignService.execute({
      positionIds: body.positionIds,
      toPersonId: body.toPersonId,
      toProjectId: body.toProjectId,
      reason: body.reason,
      actorId,
      actorRoles,
    });
  }

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition a project position to a new fill-status' })
  @ApiOkResponse({ type: ProjectPositionResponseDto })
  @RequireRoles(...STAFFING_ROLES)
  public async transition(
    @Param('id', ParsePublicIdOrUuid(AggregateType.ProjectPosition)) id: string,
    @Body() body: TransitionProjectPositionFillRequestDto,
    @Req() request: RequestWithPrincipal,
  ): Promise<ProjectPositionResponseDto> {
    const actorId = request.principal?.personId ?? request.principal?.userId ?? '';
    const actorRoles = request.principal?.roles ?? [];
    const position = await this.transitionService.execute({
      positionId: id,
      toStatus: body.toStatus,
      actorId,
      actorRoles,
      reason: body.reason,
      caseId: body.caseId,
      personId: body.personId,
      allocationPercent: body.allocationPercent,
      validFrom: body.validFrom,
      validTo: body.validTo,
    });
    return ProjectPositionResponseDto.from(position);
  }

}

@ApiTags('people')
@Controller('people')
export class PeopleBenchController {
  public constructor(
    private readonly benchService: ListBenchPeopleService,
    private readonly enrichedBenchService: ListEnrichedBenchService,
    private readonly suggestFillsService: SuggestFillsService,
  ) {}

  @Post('bench/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Check bench state (active-fill summary) for a list of people on a given as-of date',
  })
  @ApiOkResponse({ type: BenchCheckResponseDto })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async check(@Body() body: BenchCheckRequestDto): Promise<BenchCheckResponseDto> {
    const asOf = body.asOf ? new Date(body.asOf) : new Date();
    const people = await this.benchService.checkPeople(body.personIds, asOf);
    return { people };
  }

  @Get('bench')
  @ApiOperation({
    summary:
      'FE-#261 — enriched bench listing (name / role / office / grade / daysOnBench / ' +
      'availabilityHours14d / suggestedProjectIds). Tenant-scoped.',
  })
  @ApiOkResponse({ type: [Object] })
  @RequireRoles(...STAFFING_ROLES)
  public async listEnrichedBench(): Promise<BenchEnrichedRowDto[]> {
    return this.enrichedBenchService.listBench();
  }

  @Get(':personId/suggested-positions')
  @ApiOperation({
    summary:
      'Ranked OPEN positions matching a person (inverse of /project-positions/:id/candidates). ' +
      'Same SuggestFillsService.score — skill + role + availability.',
  })
  @ApiOkResponse({ type: PersonSuggestedPositionsResponseDto })
  @RequireRoles(...STAFFING_ROLES)
  public async suggestedPositions(
    @Param('personId', ParseUUIDPipe) personId: string,
    @Query('limit') limit?: string,
  ): Promise<PersonSuggestedPositionsResponseDto> {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    const take = parsed && Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : undefined;
    return this.suggestFillsService.suggestForPerson(personId, take);
  }
}
