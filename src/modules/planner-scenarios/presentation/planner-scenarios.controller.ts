import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { STAFFING_ROLES } from '@src/shared/auth/role-presets';

import {
  CreatePlannerScenarioRequestDto,
  ListPlannerScenariosQueryDto,
  PlannerScenarioDto,
  UpdatePlannerScenarioRequestDto,
} from '../application/contracts/planner-scenario.dto';
import { PlannerScenarioService } from '../application/planner-scenario.service';

function resolveActor(req: { principal?: RequestPrincipal }): string {
  const id = req.principal?.personId ?? req.principal?.userId;
  if (!id) throw new BadRequestException('Could not determine actor identity from request.');
  return id;
}

@ApiTags('staffing')
@Controller('staffing/scenarios')
export class PlannerScenariosController {
  public constructor(private readonly service: PlannerScenarioService) {}

  @Get()
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({ summary: 'LEAN-P4a-1 — list planner scenarios (filter by owner=me, status, limit)' })
  @ApiOkResponse({ type: [Object] })
  public async list(
    @Query() query: ListPlannerScenariosQueryDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PlannerScenarioDto[]> {
    const ownerId = query.owner === 'me' ? resolveActor(req) : undefined;
    return this.service.list({ ownerId, status: query.status, limit: query.limit });
  }

  @Get(':id')
  @RequireRoles(...STAFFING_ROLES)
  @ApiOperation({ summary: 'LEAN-P4a-1 — get planner scenario by id' })
  @ApiOkResponse({ type: Object })
  public async getById(@Param('id', ParseUUIDPipe) id: string): Promise<PlannerScenarioDto> {
    return this.service.getById(id);
  }

  @Post()
  @RequireRoles(...STAFFING_ROLES)
  @ApiCreatedResponse({ type: Object })
  @ApiOperation({ summary: 'LEAN-P4a-1 — create planner scenario (DRAFT)' })
  public async create(
    @Body() body: CreatePlannerScenarioRequestDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PlannerScenarioDto> {
    const actor = resolveActor(req);
    return this.service.create(actor, body);
  }

  @Patch(':id')
  @RequireRoles(...STAFFING_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LEAN-P4a-1 — update planner scenario (owner-only / admin)' })
  @ApiOkResponse({ type: Object })
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePlannerScenarioRequestDto,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<PlannerScenarioDto> {
    const actor = resolveActor(req);
    return this.service.update(id, actor, req.principal?.roles ?? [], body);
  }

  @Delete(':id')
  @RequireRoles(...STAFFING_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'LEAN-P4a-1 — soft-cancel planner scenario (status=CANCELLED, owner or admin)',
  })
  public async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<void> {
    const actor = resolveActor(req);
    await this.service.cancel(id, actor, req.principal?.roles ?? []);
  }
}
