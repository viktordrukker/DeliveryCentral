import { Logger } from '@nestjs/common';

import { CustomFieldDefinition } from '@src/modules/metadata/domain/entities/custom-field-definition.entity';
import { CustomFieldDefinitionRepositoryPort } from '@src/modules/metadata/domain/repositories/custom-field-definition-repository.port';

import { MetadataPrismaMapper } from './metadata-prisma.mapper';

// F-18 / 20c-12 — cap on findByEntityType(). Custom fields are
// admin-curated per entity type; even with heavy customization a
// tenant won't approach the cap. Warn log surfaces drift.
const FIND_BY_ENTITY_TYPE_MAX = 500;

interface CustomFieldDefinitionGateway {
  delete(args: Record<string, unknown>): Promise<unknown>;
  findFirst(args: Record<string, unknown>): Promise<{
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
  } | null>;
  findMany(args: Record<string, unknown>): Promise<
    Array<{
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
    }>
  >;
  upsert(args: Record<string, unknown>): Promise<unknown>;
}

export class PrismaCustomFieldDefinitionRepository
  implements CustomFieldDefinitionRepositoryPort
{
  private readonly logger = new Logger(PrismaCustomFieldDefinitionRepository.name);

  public constructor(private readonly gateway: CustomFieldDefinitionGateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findByEntityType(
    entityType: string,
    scopeOrgUnitId?: string,
  ): Promise<CustomFieldDefinition[]> {
    const records = await this.gateway.findMany({
      where: {
        entityType,
        scopeOrgUnitId: scopeOrgUnitId ?? undefined,
      },
      take: FIND_BY_ENTITY_TYPE_MAX,
    });

    if (records.length === FIND_BY_ENTITY_TYPE_MAX) {
      this.logger.warn(
        `findByEntityType(${entityType}) hit the ${FIND_BY_ENTITY_TYPE_MAX}-row cap; some definitions omitted.`,
      );
    }

    return records.map((record) => MetadataPrismaMapper.toCustomFieldDefinition(record));
  }

  public async findById(id: string): Promise<CustomFieldDefinition | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? MetadataPrismaMapper.toCustomFieldDefinition(record) : null;
  }

  public async save(aggregate: CustomFieldDefinition): Promise<void> {
    await this.gateway.upsert({
      create: {
        archivedAt: aggregate.archivedAt ?? null,
        dataType: aggregate.dataType,
        defaultValue: aggregate.defaultValue ?? null,
        description: aggregate.description ?? null,
        displayName: aggregate.displayName,
        entityType: aggregate.entityType,
        fieldKey: aggregate.fieldKey,
        id: aggregate.id,
        isEnabled: aggregate.isEnabled,
        isRequired: aggregate.isRequired,
        metadataDictionaryId: aggregate.metadataDictionaryId ?? null,
        scopeOrgUnitId: aggregate.scopeOrgUnitId ?? null,
      },
      update: {
        archivedAt: aggregate.archivedAt ?? null,
        dataType: aggregate.dataType,
        defaultValue: aggregate.defaultValue ?? null,
        description: aggregate.description ?? null,
        displayName: aggregate.displayName,
        entityType: aggregate.entityType,
        fieldKey: aggregate.fieldKey,
        isEnabled: aggregate.isEnabled,
        isRequired: aggregate.isRequired,
        metadataDictionaryId: aggregate.metadataDictionaryId ?? null,
        scopeOrgUnitId: aggregate.scopeOrgUnitId ?? null,
      },
      where: { id: aggregate.id },
    });
  }
}
