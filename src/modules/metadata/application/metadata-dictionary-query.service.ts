import { Injectable } from '@nestjs/common';

import {
  demoCustomFieldDefinitions,
  demoEntityLayoutDefinitions,
  demoWorkflowDefinitions,
} from '../../../../prisma/seeds/demo-dataset';
import { MetadataDictionaryRepositoryPort } from '../domain/repositories/metadata-dictionary-repository.port';
import { MetadataEntryRepositoryPort } from '../domain/repositories/metadata-entry-repository.port';
import {
  MetadataDictionaryDetailsDto,
  MetadataDictionaryEntryDto,
  MetadataDictionarySummaryDto,
} from './contracts/metadata-dictionary.dto';
import { MetadataDictionaryQueryDto } from './contracts/metadata-dictionary.query';

function includesIgnoreCase(value: string | undefined, search: string): boolean {
  return (value ?? '').toLowerCase().includes(search.toLowerCase());
}

@Injectable()
export class MetadataDictionaryQueryService {
  public constructor(
    private readonly metadataDictionaryRepository: MetadataDictionaryRepositoryPort,
    private readonly metadataEntryRepository: MetadataEntryRepositoryPort,
  ) {}

  public async listDictionaries(
    query: MetadataDictionaryQueryDto,
  ): Promise<{ items: MetadataDictionarySummaryDto[] }> {
    const dictionaries = await this.metadataDictionaryRepository.list();

    const summaries = await Promise.all(
      dictionaries.map((dictionary) => this.toSummary(dictionary.id)),
    );

    const items = summaries
      .filter((dictionary) => {
        if (query.entityType && dictionary.entityType !== query.entityType) {
          return false;
        }

        if (query.scopeOrgUnitId && dictionary.scopeOrgUnitId !== query.scopeOrgUnitId) {
          return false;
        }

        if (query.search) {
          const matches =
            includesIgnoreCase(dictionary.displayName, query.search) ||
            includesIgnoreCase(dictionary.dictionaryKey, query.search) ||
            includesIgnoreCase(dictionary.entityType, query.search) ||
            includesIgnoreCase(dictionary.description, query.search);

          if (!matches) {
            return false;
          }
        }

        return true;
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName));

    return { items };
  }

  public async getDictionaryById(id: string): Promise<MetadataDictionaryDetailsDto | null> {
    const dictionary = await this.metadataDictionaryRepository.findById(id);

    if (!dictionary) {
      return null;
    }

    const summary = await this.toSummary(id);
    const entries = await this.metadataEntryRepository.findByDictionaryId(id);

    return {
      ...summary,
      entries: entries
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map<MetadataDictionaryEntryDto>((entry) => ({
          archivedAt: entry.archivedAt?.toISOString() ?? null,
          displayName: entry.displayName,
          entryKey: entry.entryKey,
          entryValue: entry.entryValue,
          id: entry.id,
          isEnabled: entry.isEnabled,
          sortOrder: entry.sortOrder,
        })),
      relatedCustomFields: demoCustomFieldDefinitions
        .filter((field) => field.metadataDictionaryId === id)
        .map((field) => ({
          dataType: field.dataType,
          displayName: field.displayName,
          entityType: field.entityType,
          fieldKey: field.fieldKey,
          id: field.id,
          isRequired: field.isRequired,
        })),
      relatedLayouts: demoEntityLayoutDefinitions
        .filter(
          (layout) =>
            layout.entityType === dictionary.entityType &&
            (!dictionary.scopeOrgUnitId || layout.scopeOrgUnitId === dictionary.scopeOrgUnitId),
        )
        .map((layout) => ({
          displayName: layout.displayName,
          entityType: layout.entityType,
          id: layout.id,
          isDefault: layout.isDefault,
          layoutKey: layout.layoutKey,
          version: layout.version,
        })),
      relatedWorkflows: demoWorkflowDefinitions
        .filter((workflow) => workflow.entityType === dictionary.entityType)
        .map((workflow) => ({
          displayName: workflow.displayName,
          entityType: workflow.entityType,
          id: workflow.id,
          status: workflow.status,
          version: workflow.version,
          workflowKey: workflow.workflowKey,
        })),
    };
  }

  private async toSummary(id: string): Promise<MetadataDictionarySummaryDto> {
    const dictionary = await this.metadataDictionaryRepository.findById(id);

    if (!dictionary) {
      throw new Error(`Metadata dictionary not found for id ${id}.`);
    }

    const entries = await this.metadataEntryRepository.findByDictionaryId(id);
    const relatedCustomFieldCount = demoCustomFieldDefinitions.filter(
      (field) => field.metadataDictionaryId === id,
    ).length;
    const workflowUsageCount = demoWorkflowDefinitions.filter(
      (workflow) => workflow.entityType === dictionary.entityType,
    ).length;

    return {
      description: dictionary.description,
      dictionaryKey: dictionary.dictionaryKey,
      displayName: dictionary.displayName,
      enabledEntryCount: entries.filter((entry) => entry.isEnabled).length,
      entityType: dictionary.entityType,
      entryCount: entries.length,
      id: dictionary.id,
      isArchived: Boolean(dictionary.archivedAt),
      isSystemManaged: dictionary.isSystemManaged,
      relatedCustomFieldCount,
      scopeOrgUnitId: dictionary.scopeOrgUnitId ?? null,
      workflowUsageCount,
    };
  }
}
