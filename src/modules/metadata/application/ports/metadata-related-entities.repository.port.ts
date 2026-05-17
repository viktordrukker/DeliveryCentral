/**
 * F-14.4 / 20c-04 — port for the three "related-entity" lookups the
 * dictionary admin surface needs (CustomFieldDefinition counts/lists,
 * EntityLayoutDefinition lists, WorkflowDefinition counts/lists).
 *
 * Previously the query service spoke Prisma directly. Extracting these
 * calls into a port lets the query service describe its data needs
 * abstractly and keeps repository ownership inside this module's
 * `infrastructure/` layer.
 */
export interface MetadataRelatedCustomFieldRow {
  id: string;
  fieldKey: string;
  displayName: string;
  dataType: string;
  entityType: string;
  isRequired: boolean;
}

export interface MetadataRelatedLayoutRow {
  id: string;
  layoutKey: string;
  displayName: string;
  entityType: string;
  isDefault: boolean;
  version: number;
}

export interface MetadataRelatedWorkflowRow {
  id: string;
  workflowKey: string;
  displayName: string;
  entityType: string;
  status: string;
  version: number;
}

export interface MetadataRelatedEntitiesRepositoryPort {
  listCustomFieldsForDictionary(metadataDictionaryId: string): Promise<MetadataRelatedCustomFieldRow[]>;
  countCustomFieldsForDictionary(metadataDictionaryId: string): Promise<number>;
  listLayoutsForEntityType(
    entityType: string,
    scopeOrgUnitId?: string | null,
  ): Promise<MetadataRelatedLayoutRow[]>;
  listWorkflowsForEntityType(entityType: string): Promise<MetadataRelatedWorkflowRow[]>;
  countWorkflowsForEntityType(entityType: string): Promise<number>;
}

export const METADATA_RELATED_ENTITIES_REPOSITORY = Symbol.for(
  'MetadataRelatedEntitiesRepositoryPort',
);
