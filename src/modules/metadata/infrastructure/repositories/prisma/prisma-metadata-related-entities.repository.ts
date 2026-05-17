import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  MetadataRelatedCustomFieldRow,
  MetadataRelatedEntitiesRepositoryPort,
  MetadataRelatedLayoutRow,
  MetadataRelatedWorkflowRow,
} from '../../../application/ports/metadata-related-entities.repository.port';

/**
 * F-14.4 / 20c-04 — Prisma adapter for the related-entity lookups
 * previously inlined in `MetadataDictionaryQueryService`. Moves the
 * three Prisma touchpoints (CustomFieldDefinition / EntityLayoutDefinition
 * / WorkflowDefinition) into the metadata module's infrastructure layer.
 */
@Injectable()
export class PrismaMetadataRelatedEntitiesRepository
  implements MetadataRelatedEntitiesRepositoryPort
{
  public constructor(private readonly prisma: PrismaService) {}

  public async listCustomFieldsForDictionary(
    metadataDictionaryId: string,
  ): Promise<MetadataRelatedCustomFieldRow[]> {
    return this.prisma.customFieldDefinition.findMany({
      where: { metadataDictionaryId },
      select: {
        id: true,
        fieldKey: true,
        displayName: true,
        dataType: true,
        entityType: true,
        isRequired: true,
      },
    });
  }

  public async countCustomFieldsForDictionary(metadataDictionaryId: string): Promise<number> {
    return this.prisma.customFieldDefinition.count({
      where: { metadataDictionaryId },
    });
  }

  public async listLayoutsForEntityType(
    entityType: string,
    scopeOrgUnitId?: string | null,
  ): Promise<MetadataRelatedLayoutRow[]> {
    return this.prisma.entityLayoutDefinition.findMany({
      where: {
        entityType,
        ...(scopeOrgUnitId ? { scopeOrgUnitId } : {}),
      },
      select: {
        id: true,
        layoutKey: true,
        displayName: true,
        entityType: true,
        isDefault: true,
        version: true,
      },
    });
  }

  public async listWorkflowsForEntityType(
    entityType: string,
  ): Promise<MetadataRelatedWorkflowRow[]> {
    return this.prisma.workflowDefinition.findMany({
      where: { entityType },
      select: {
        id: true,
        workflowKey: true,
        displayName: true,
        entityType: true,
        status: true,
        version: true,
      },
    });
  }

  public async countWorkflowsForEntityType(entityType: string): Promise<number> {
    return this.prisma.workflowDefinition.count({
      where: { entityType },
    });
  }
}
