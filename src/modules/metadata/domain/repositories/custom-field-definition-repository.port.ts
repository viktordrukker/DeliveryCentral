import { RepositoryPort } from '@src/shared/domain/repository-port';

import { CustomFieldDefinition } from '../entities/custom-field-definition.entity';

export interface CustomFieldDefinitionRepositoryPort
  extends RepositoryPort<CustomFieldDefinition>
{
  findByEntityType(entityType: string, scopeOrgUnitId?: string): Promise<CustomFieldDefinition[]>;
}
