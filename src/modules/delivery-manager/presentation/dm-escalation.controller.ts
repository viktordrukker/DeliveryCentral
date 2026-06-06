import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { DELIVERY_EXEC_ROLES, EXEC_ROLES } from '@src/shared/auth/role-presets';

import {
  CreateDmEscalationDto,
  DmEscalationResponseDto,
  ResolveDmEscalationDto,
} from '../application/contracts/dm-escalation.dto';
import { DmEscalationService } from '../application/dm-escalation.service';

interface AuthRequest {
  principal?: RequestPrincipal;
}

function requirePersonId(req: AuthRequest): string {
  const id = req.principal?.personId ?? req.principal?.userId;
  if (!id) throw new BadRequestException('Actor identity required.');
  return id;
}

@ApiTags('dm-escalations')
@Controller('dm-escalations')
export class DmEscalationController {
  public constructor(private readonly service: DmEscalationService) {}

  @Post()
  @RequireRoles(...DELIVERY_EXEC_ROLES)
  @ApiOperation({ summary: 'Open a DM rejection escalation to a Director.' })
  @ApiOkResponse({ type: DmEscalationResponseDto })
  public async create(
    @Body() dto: CreateDmEscalationDto,
    @Req() req: AuthRequest,
  ): Promise<DmEscalationResponseDto> {
    const personId = requirePersonId(req);
    return this.service.createEscalation(
      { personId, roles: req.principal!.roles },
      {
        sourceKind: dto.sourceKind,
        sourceId: dto.sourceId,
        reason: dto.reason,
        escalatedToPersonId: dto.escalatedToPersonId ?? null,
      },
    );
  }

  @Get('pending')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({ summary: 'List escalations awaiting Director triage.' })
  @ApiOkResponse({ type: [DmEscalationResponseDto] })
  public async listPending(): Promise<DmEscalationResponseDto[]> {
    return this.service.listPending();
  }

  @Get('mine')
  @RequireRoles(...DELIVERY_EXEC_ROLES)
  @ApiOperation({ summary: 'List escalations the requester opened.' })
  @ApiOkResponse({ type: [DmEscalationResponseDto] })
  public async listMine(@Req() req: AuthRequest): Promise<DmEscalationResponseDto[]> {
    const personId = requirePersonId(req);
    return this.service.listMine(personId);
  }

  @Post(':id/confirm')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({ summary: 'Director confirms the DM rejection — it stands.' })
  @ApiOkResponse({ type: DmEscalationResponseDto })
  public async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDmEscalationDto,
    @Req() req: AuthRequest,
  ): Promise<DmEscalationResponseDto> {
    const personId = requirePersonId(req);
    return this.service.confirmEscalation(
      { personId, roles: req.principal!.roles },
      id,
      dto.notes,
    );
  }

  @Post(':id/override')
  @RequireRoles(...EXEC_ROLES)
  @ApiOperation({ summary: 'Director overrides the DM rejection — DM must re-approve upstream.' })
  @ApiOkResponse({ type: DmEscalationResponseDto })
  public async override(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDmEscalationDto,
    @Req() req: AuthRequest,
  ): Promise<DmEscalationResponseDto> {
    const personId = requirePersonId(req);
    return this.service.overrideEscalation(
      { personId, roles: req.principal!.roles },
      id,
      dto.notes,
    );
  }

  @Post(':id/cancel')
  @RequireRoles(...DELIVERY_EXEC_ROLES)
  @ApiOperation({ summary: 'DM withdraws their own pending escalation.' })
  @ApiOkResponse({ type: DmEscalationResponseDto })
  public async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDmEscalationDto,
    @Req() req: AuthRequest,
  ): Promise<DmEscalationResponseDto> {
    const personId = requirePersonId(req);
    return this.service.cancelEscalation(
      { personId, roles: req.principal!.roles },
      id,
      dto.notes,
    );
  }
}
