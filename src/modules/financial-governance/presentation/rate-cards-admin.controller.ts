import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { Idempotent } from '@src/shared/http/idempotent.decorator';

import {
  CreateRateCardDto,
  CreateRateCardEntryDto,
  RateCardEntryResponseDto,
  RateCardResponseDto,
  RateCardWithEntriesResponseDto,
  UpdateRateCardDto,
  UpdateRateCardEntryDto,
} from '../application/contracts/rate-card.dto';
import { RateCardAdminService } from '../application/rate-card-admin.service';

@ApiTags('admin-rate-cards')
@Controller('admin/rate-cards')
export class RateCardsAdminController {
  public constructor(private readonly service: RateCardAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List rate cards (filter optional).' })
  @ApiOkResponse({ type: [RateCardResponseDto] })
  @RequireRoles('admin')
  public list(
    @Query('clientId') clientId?: string,
    @Query('includeArchived') includeArchived?: string,
  ): Promise<RateCardResponseDto[]> {
    return this.service.list({
      clientId: clientId || undefined,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rate card with its entries.' })
  @ApiOkResponse({ type: RateCardWithEntriesResponseDto })
  @RequireRoles('admin')
  public getById(@Param('id') id: string): Promise<RateCardWithEntriesResponseDto> {
    return this.service.getById(id);
  }

  @Post()
  @Idempotent()
  @ApiOperation({ summary: 'Create a rate card.' })
  @ApiOkResponse({ type: RateCardResponseDto })
  @RequireRoles('admin')
  public create(
    @Body() dto: CreateRateCardDto,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<RateCardResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) throw new BadRequestException('Authenticated actor required.');
    return this.service.create(dto, actorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update rate card metadata.' })
  @ApiOkResponse({ type: RateCardResponseDto })
  @RequireRoles('admin')
  public update(
    @Param('id') id: string,
    @Body() dto: UpdateRateCardDto,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<RateCardResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) throw new BadRequestException('Authenticated actor required.');
    return this.service.update(id, dto, actorId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a rate card (soft delete).' })
  @ApiOkResponse({ type: RateCardResponseDto })
  @RequireRoles('admin')
  public archive(
    @Param('id') id: string,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<RateCardResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) throw new BadRequestException('Authenticated actor required.');
    return this.service.archive(id, actorId);
  }

  @Post(':id/entries')
  @Idempotent()
  @ApiOperation({ summary: 'Add an entry to a rate card.' })
  @ApiOkResponse({ type: RateCardEntryResponseDto })
  @RequireRoles('admin')
  public createEntry(
    @Param('id') cardId: string,
    @Body() dto: CreateRateCardEntryDto,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<RateCardEntryResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) throw new BadRequestException('Authenticated actor required.');
    return this.service.createEntry(cardId, dto, actorId);
  }

  @Patch(':id/entries/:entryId')
  @ApiOperation({ summary: 'Update a rate card entry.' })
  @ApiOkResponse({ type: RateCardEntryResponseDto })
  @RequireRoles('admin')
  public updateEntry(
    @Param('id') cardId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateRateCardEntryDto,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<RateCardEntryResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) throw new BadRequestException('Authenticated actor required.');
    return this.service.updateEntry(cardId, entryId, dto, actorId);
  }

  @Delete(':id/entries/:entryId')
  @ApiOperation({ summary: 'Archive a rate card entry (soft delete).' })
  @ApiOkResponse({ type: RateCardEntryResponseDto })
  @RequireRoles('admin')
  public archiveEntry(
    @Param('id') cardId: string,
    @Param('entryId') entryId: string,
    @Req() req: { principal?: { personId?: string } },
  ): Promise<RateCardEntryResponseDto> {
    const actorId = req.principal?.personId ?? '';
    if (!actorId) throw new BadRequestException('Authenticated actor required.');
    return this.service.archiveEntry(cardId, entryId, actorId);
  }
}
