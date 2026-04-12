import { CustomFieldDefinition } from '@src/modules/metadata/domain/entities/custom-field-definition.entity';
import { EntityLayoutDefinition } from '@src/modules/metadata/domain/entities/entity-layout-definition.entity';
import { MetadataDictionary } from '@src/modules/metadata/domain/entities/metadata-dictionary.entity';
import { MetadataEntry } from '@src/modules/metadata/domain/entities/metadata-entry.entity';
import { WorkflowDefinition } from '@src/modules/metadata/domain/entities/workflow-definition.entity';
import { WorkflowStateDefinition } from '@src/modules/metadata/domain/entities/workflow-state-definition.entity';

interface PrismaMetadataDictionaryRecord {
  archivedAt: Date | null;
  description: string | null;
  dictionaryKey: string;
  displayName: string;
  entityType: string;
  id: string;
  isSystemManaged: boolean;
  scopeOrgUnitId: string | null;
}

interface PrismaMetadataEntryRecord {
  archivedAt: Date | null;
  displayName: string;
  entryKey: string;
  entryValue: string;
  id: string;
  isEnabled: boolean;
  metadataDictionaryId: string;
  sortOrder: number;
}

interface PrismaCustomFieldDefinitionRecord {
  archivedAt: Date | null;
  dataType: 'BOOLEAN' | 'DATE' | 'DATETIME' | 'DECIMAL' | 'ENUM' | 'JSON' | 'LONG_TEXT' | 'NUMBER' | 'TEXT';
  defaultValue: unknown;
  description: string | null;
  displayName: string;
  entityType: string;
  fieldKey: string;
  id: string;
  isEnabled: boolean;
  isRequired: boolean;
  metadataDictionaryId: string | null;
  scopeOrgUnitId: string | null;
}

interface PrismaWorkflowDefinitionRecord {
  archivedAt: Date | null;
  definition: Record<string, unknown> | null;
  displayName: string;
  entityType: string;
  id: string;
  status: 'ACTIVE' | 'DRAFT' | 'RETIRED';
  version: number;
  workflowKey: string;
}

interface PrismaWorkflowStateDefinitionRecord {
  displayName: string;
  id: string;
  isInitial: boolean;
  isTerminal: boolean;
  sequenceNumber: number;
  stateKey: string;
  validationSchema: Record<string, unknown> | null;
  workflowDefinitionId: string;
}

interface PrismaEntityLayoutDefinitionRecord {
  archivedAt: Date | null;
  displayName: string;
  entityType: string;
  id: string;
  isDefault: boolean;
  layoutKey: string;
  layoutSchema: Record<string, unknown>;
  scopeOrgUnitId: string | null;
  version: number;
}

export class MetadataPrismaMapper {
  public static toDictionary(record: PrismaMetadataDictionaryRecord): MetadataDictionary {
    return MetadataDictionary.create(
      {
        archivedAt: record.archivedAt ?? undefined,
        description: record.description ?? undefined,
        dictionaryKey: record.dictionaryKey,
        displayName: record.displayName,
        entityType: record.entityType,
        isSystemManaged: record.isSystemManaged,
        scopeOrgUnitId: record.scopeOrgUnitId ?? undefined,
      },
      record.id,
    );
  }

  public static toEntry(record: PrismaMetadataEntryRecord): MetadataEntry {
    return MetadataEntry.create(
      {
        archivedAt: record.archivedAt ?? undefined,
        displayName: record.displayName,
        entryKey: record.entryKey,
        entryValue: record.entryValue,
        isEnabled: record.isEnabled,
        metadataDictionaryId: record.metadataDictionaryId,
        sortOrder: record.sortOrder,
      },
      record.id,
    );
  }

  public static toCustomFieldDefinition(
    record: PrismaCustomFieldDefinitionRecord,
  ): CustomFieldDefinition {
    return CustomFieldDefinition.create(
      {
        archivedAt: record.archivedAt ?? undefined,
        dataType: record.dataType,
        defaultValue: record.defaultValue,
        description: record.description ?? undefined,
        displayName: record.displayName,
        entityType: record.entityType,
        fieldKey: record.fieldKey,
        isEnabled: record.isEnabled,
        isRequired: record.isRequired,
        metadataDictionaryId: record.metadataDictionaryId ?? undefined,
        scopeOrgUnitId: record.scopeOrgUnitId ?? undefined,
      },
      record.id,
    );
  }

  public static toWorkflowDefinition(
    record: PrismaWorkflowDefinitionRecord,
  ): WorkflowDefinition {
    return WorkflowDefinition.create(
      {
        archivedAt: record.archivedAt ?? undefined,
        definition: record.definition ?? undefined,
        displayName: record.displayName,
        entityType: record.entityType,
        status: record.status,
        version: record.version,
        workflowKey: record.workflowKey,
      },
      record.id,
    );
  }

  public static toWorkflowStateDefinition(
    record: PrismaWorkflowStateDefinitionRecord,
  ): WorkflowStateDefinition {
    return WorkflowStateDefinition.create(
      {
        displayName: record.displayName,
        isInitial: record.isInitial,
        isTerminal: record.isTerminal,
        sequenceNumber: record.sequenceNumber,
        stateKey: record.stateKey,
        validationSchema: record.validationSchema ?? undefined,
        workflowDefinitionId: record.workflowDefinitionId,
      },
      record.id,
    );
  }

  public static toLayoutDefinition(
    record: PrismaEntityLayoutDefinitionRecord,
  ): EntityLayoutDefinition {
    return EntityLayoutDefinition.create(
      {
        archivedAt: record.archivedAt ?? undefined,
        displayName: record.displayName,
        entityType: record.entityType,
        isDefault: record.isDefault,
        layoutKey: record.layoutKey,
        layoutSchema: record.layoutSchema,
        scopeOrgUnitId: record.scopeOrgUnitId ?? undefined,
        version: record.version,
      },
      record.id,
    );
  }
}
