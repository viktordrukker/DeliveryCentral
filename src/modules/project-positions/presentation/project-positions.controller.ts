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
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import {
  ALL_AUTHENTICATED_ROLES,
  PROJECT_DELIVERY_ROLES,
  STAFFING_ROLES,
} from '@src/shared/auth/role-presets';

import {
  BenchCheckRequestDto,
  CreateProjectPositionRequestDto,
  ListProjectPositionsQueryDto,
  TransitionProjectPositionFillRequestDto,
} from '../application/contracts/project-position-requests';
import {
  BenchCheckResponseDto,
  ListProjectPositionsResponseDto,
  ProjectPositionResponseDto,
} from '../application/contracts/project-position-responses';
import { CreateProjectPositionService } from '../application/create-project-position.service';
import { GetProjectPositionByIdService } from '../application/get-project-position-by-id.service';
import { ListBenchPeopleService } from '../application/list-bench-people.service';
import { ListProjectPositionsService } from '../application/list-project-positions.service';
import { TransitionProjectPositionFillService } from '../application/transition-project-position-fill.service';

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
export class ProjectPositionsController {
  public constructor(
    private readonly createService: CreateProjectPositionService,
    private readonly transitionService: TransitionProjectPositionFillService,
    private readonly listService: ListProjectPositionsService,
    private readonly getService: GetProjectPositionByIdService,
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
  @ApiOperation({ summary: 'Get a project position by id' })
  @ApiOkResponse({ type: ProjectPositionResponseDto })
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  public async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectPositionResponseDto> {
    const position = await this.getService.execute(id);
    return ProjectPositionResponseDto.from(position);
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

  @Post(':id/transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transition a project position to a new fill-status' })
  @ApiOkResponse({ type: ProjectPositionResponseDto })
  @RequireRoles(...STAFFING_ROLES)
  public async transition(
    @Param('id', ParseUUIDPipe) id: string,
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
  public constructor(private readonly benchService: ListBenchPeopleService) {}

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
}
