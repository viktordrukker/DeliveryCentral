import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
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

import { ALL_AUTHENTICATED_ROLES, ALL_MANAGER_ROLES } from '@src/shared/auth/role-presets';
const PRIVILEGED_EVIDENCE_ROLES = new Set([
  'project_manager',
  'resource_manager',
  'delivery_manager',
  'hr_manager',
  'director',
  'admin',
]);

import { CreateWorkEvidenceRequestDto } from '../application/contracts/create-work-evidence.request';
import { ListWorkEvidenceQueryDto } from '../application/contracts/list-work-evidence.query';
import {
  ListWorkEvidenceResponseDto,
  WorkEvidenceResponseDto,
} from '../application/contracts/work-evidence.response';
import { CreateWorkEvidenceService } from '../application/create-work-evidence.service';
import { ListWorkEvidenceService } from '../application/list-work-evidence.service';
import { UpdateWorkEvidenceService } from '../application/update-work-evidence.service';
import { WorkEvidence } from '../domain/entities/work-evidence.entity';

class UpdateWorkEvidenceRequestDto {
  public effortHours?: number;
  public occurredOn?: string;
  public sourceRecordKey?: string;
  public summary?: string;
}

@ApiTags('work-evidence')
@Controller('work-evidence')
export class WorkEvidenceController {
  public constructor(
    private readonly createWorkEvidenceService: CreateWorkEvidenceService,
    private readonly listWorkEvidenceService: ListWorkEvidenceService,
    private readonly updateWorkEvidenceService: UpdateWorkEvidenceService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(...ALL_MANAGER_ROLES)
  @ApiOperation({ summary: 'Create a manual or internal work evidence record' })
  @ApiCreatedResponse({ type: WorkEvidenceResponseDto })
  public async createWorkEvidence(
    @Body() request: CreateWorkEvidenceRequestDto,
  ): Promise<WorkEvidenceResponseDto> {
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!request.personId?.trim() || !UUID_PATTERN.test(request.personId)) {
      throw new BadRequestException('personId is required and must be a valid UUID.');
    }

    if (!request.projectId?.trim() || !UUID_PATTERN.test(request.projectId)) {
      throw new BadRequestException('projectId is required and must be a valid UUID.');
    }

    try {
      return this.mapResponse(await this.createWorkEvidenceService.execute(request));
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Work evidence creation failed.',
      );
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(...ALL_MANAGER_ROLES)
  @ApiOperation({ summary: 'Update a manual/internal work evidence record' })
  @ApiOkResponse({ type: WorkEvidenceResponseDto })
  @ApiNotFoundResponse({ description: 'Work evidence not found.' })
  public async updateWorkEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() request: UpdateWorkEvidenceRequestDto,
  ): Promise<WorkEvidenceResponseDto> {
    try {
      return this.mapResponse(
        await this.updateWorkEvidenceService.execute({
          effortHours: request.effortHours,
          occurredOn: request.occurredOn,
          sourceRecordKey: request.sourceRecordKey,
          summary: request.summary,
          workEvidenceId: id,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Work evidence update failed.';
      if (message === 'Work evidence not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Get()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'List work evidence records with optional filters' })
  @ApiQuery({ name: 'personId', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'sourceType', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiOkResponse({ type: ListWorkEvidenceResponseDto })
  public async listWorkEvidence(
    @Req() req: { principal?: RequestPrincipal },
    @Query() query: ListWorkEvidenceQueryDto,
  ): Promise<ListWorkEvidenceResponseDto> {
    const isPrivileged = (req.principal?.roles ?? []).some((r) => PRIVILEGED_EVIDENCE_ROLES.has(r));
    const scopedQuery: ListWorkEvidenceQueryDto = isPrivileged
      ? query
      : { ...query, personId: req.principal?.personId };

    if (!isPrivileged && !scopedQuery.personId) {
      throw new BadRequestException('Cannot resolve self-scope: principal has no personId.');
    }

    try {
      const result = await this.listWorkEvidenceService.execute(scopedQuery);
      return {
        items: result.items.map((item) => this.mapResponse(item)),
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Work evidence query failed.',
      );
    }
  }

  private mapResponse(workEvidence: WorkEvidence): WorkEvidenceResponseDto {
    return {
      activityDate: (workEvidence.occurredOn ?? workEvidence.recordedAt).toISOString(),
      details: workEvidence.details,
      effortHours: workEvidence.durationMinutes
        ? Number((workEvidence.durationMinutes / 60).toFixed(2))
        : 0,
      id: workEvidence.workEvidenceId.value,
      personId: workEvidence.personId,
      projectId: workEvidence.projectId,
      recordedAt: workEvidence.recordedAt.toISOString(),
      sourceRecordKey: workEvidence.sourceRecordKey,
      sourceType: workEvidence.source.sourceType,
      summary: workEvidence.summary,
      trace: workEvidence.trace,
    };
  }
}
