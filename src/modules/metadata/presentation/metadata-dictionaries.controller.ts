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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { CreateDictionaryEntryRequestDto } from '../application/contracts/create-dictionary-entry.request';
import {
  MetadataDictionaryDetailsDto,
  MetadataDictionaryEntryDto,
  MetadataDictionaryListResponseDto,
} from '../application/contracts/metadata-dictionary.dto';
import { CreateDictionaryEntryService } from '../application/create-dictionary-entry.service';
import { ToggleDictionaryEntryService } from '../application/toggle-dictionary-entry.service';
import { MetadataDictionaryQueryDto } from '../application/contracts/metadata-dictionary.query';
import { MetadataDictionaryQueryService } from '../application/metadata-dictionary-query.service';

@ApiTags('metadata')
@Controller('metadata/dictionaries')
export class MetadataDictionariesController {
  public constructor(
    private readonly metadataDictionaryQueryService: MetadataDictionaryQueryService,
    private readonly createDictionaryEntryService: CreateDictionaryEntryService,
    private readonly toggleDictionaryEntryService: ToggleDictionaryEntryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List metadata dictionaries for admin visibility' })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'scopeOrgUnitId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ type: MetadataDictionaryListResponseDto })
  public async listDictionaries(
    @Query() query: MetadataDictionaryQueryDto,
  ): Promise<MetadataDictionaryListResponseDto> {
    return this.metadataDictionaryQueryService.listDictionaries(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a metadata dictionary with entries and related configuration summaries' })
  @ApiOkResponse({ type: MetadataDictionaryDetailsDto })
  @ApiNotFoundResponse({ description: 'Metadata dictionary not found.' })
  public async getDictionaryById(@Param('id') id: string): Promise<MetadataDictionaryDetailsDto> {
    const result = await this.metadataDictionaryQueryService.getDictionaryById(id);

    if (!result) {
      throw new NotFoundException('Metadata dictionary not found.');
    }

    return result;
  }

  @Post(':type/entries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a metadata dictionary entry for a supported dictionary type' })
  @ApiCreatedResponse({ type: MetadataDictionaryEntryDto })
  @RequireRoles('admin', 'hr_manager')
  public async createDictionaryEntry(
    @Param('type') type: string,
    @Body() request: CreateDictionaryEntryRequestDto,
  ): Promise<MetadataDictionaryEntryDto> {
    try {
      const entry = await this.createDictionaryEntryService.execute({
        dictionaryType: type,
        displayName: request.displayName,
        entryKey: request.entryKey,
        entryValue: request.entryValue,
        sortOrder: request.sortOrder,
      });

      return {
        archivedAt: entry.archivedAt?.toISOString() ?? null,
        displayName: entry.displayName,
        entryKey: entry.entryKey,
        entryValue: entry.entryValue,
        id: entry.id,
        isEnabled: entry.isEnabled,
        sortOrder: entry.sortOrder,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Metadata entry creation failed.';

      if (message === 'Metadata dictionary not found.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }

  @Patch('entries/:entryId')
  @ApiOperation({ summary: 'Enable or disable a metadata dictionary entry' })
  @ApiOkResponse({ type: MetadataDictionaryEntryDto })
  @ApiNotFoundResponse({ description: 'Metadata dictionary entry not found.' })
  @RequireRoles('admin', 'hr_manager')
  public async toggleDictionaryEntry(
    @Param('entryId') entryId: string,
    @Body() body: { isEnabled: boolean },
  ): Promise<MetadataDictionaryEntryDto> {
    try {
      const entry = await this.toggleDictionaryEntryService.execute({
        entryId,
        isEnabled: body.isEnabled,
      });

      return {
        archivedAt: entry.archivedAt?.toISOString() ?? null,
        displayName: entry.displayName,
        entryKey: entry.entryKey,
        entryValue: entry.entryValue,
        id: entry.id,
        isEnabled: entry.isEnabled,
        sortOrder: entry.sortOrder,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Metadata entry update failed.';

      if (message === 'Metadata dictionary entry not found.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }
}
