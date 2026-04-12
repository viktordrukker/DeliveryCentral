import { CustomFieldDefinition } from '@src/modules/metadata/domain/entities/custom-field-definition.entity';
import { CustomFieldDefinitionRepositoryPort } from '@src/modules/metadata/domain/repositories/custom-field-definition-repository.port';

import { MetadataPrismaMapper } from './metadata-prisma.mapper';

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
    });

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
