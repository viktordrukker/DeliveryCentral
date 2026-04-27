import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { MetadataEntry } from '../domain/entities/metadata-entry.entity';
import { MetadataDictionaryRepositoryPort } from '../domain/repositories/metadata-dictionary-repository.port';
import { MetadataEntryRepositoryPort } from '../domain/repositories/metadata-entry-repository.port';

interface CreateDictionaryEntryCommand {
  dictionaryType: string;
  displayName: string;
  entryKey: string;
  entryValue: string;
  sortOrder?: number;
}

const SUPPORTED_DICTIONARY_TYPES = {
  grade: 'grade',
  role: 'role',
  skillset: 'skillset',
} as const;

@Injectable()
export class CreateDictionaryEntryService {
  public constructor(
    private readonly metadataDictionaryRepository: MetadataDictionaryRepositoryPort,
    private readonly metadataEntryRepository: MetadataEntryRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(command: CreateDictionaryEntryCommand): Promise<MetadataEntry> {
    const normalizedType = command.dictionaryType.trim().toLowerCase();

    if (!(normalizedType in SUPPORTED_DICTIONARY_TYPES)) {
      throw new BadRequestException('Metadata dictionary type is not supported.');
    }

    const dictionary = await this.metadataDictionaryRepository.findByDictionaryKey(
      'Person',
      normalizedType,
    );

    if (!dictionary) {
      throw new NotFoundException('Metadata dictionary not found.');
    }

    const entryKey = command.entryKey.trim();
    const entryValue = command.entryValue.trim();
    const displayName = command.displayName.trim();

    if (!entryKey) {
      throw new BadRequestException('Metadata dictionary entryKey is required.');
    }

    if (!entryValue) {
      throw new BadRequestException('Metadata dictionary entryValue is required.');
    }

    if (!displayName) {
      throw new BadRequestException('Metadata dictionary displayName is required.');
    }

    const existingEntry = await this.metadataEntryRepository.findByEntryKey(
      dictionary.id,
      entryKey,
    );
    if (existingEntry) {
      throw new ConflictException('Metadata dictionary entryKey already exists.');
    }

    const entries = await this.metadataEntryRepository.findByDictionaryId(dictionary.id);
    const sortOrder = command.sortOrder ?? entries.length + 1;

    const entry = MetadataEntry.create({
      displayName,
      entryKey,
      entryValue,
      metadataDictionaryId: dictionary.id,
      sortOrder,
    });

    await this.metadataEntryRepository.save(entry);
    this.auditLogger?.record({
      actionType: 'metadata.dictionary.changed',
      actorId: null,
      category: 'metadata',
      changeSummary: `Metadata dictionary ${dictionary.dictionaryKey} received entry ${entry.entryKey}.`,
      details: {
        dictionaryId: dictionary.id,
        dictionaryType: normalizedType,
        entryKey: entry.entryKey,
      },
      metadata: {
        dictionaryId: dictionary.id,
        dictionaryType: normalizedType,
        displayName: entry.displayName,
        entryKey: entry.entryKey,
        entryValue: entry.entryValue,
      },
      targetEntityId: dictionary.id,
      targetEntityType: 'METADATA_DICTIONARY',
    });

    return entry;
  }
}
