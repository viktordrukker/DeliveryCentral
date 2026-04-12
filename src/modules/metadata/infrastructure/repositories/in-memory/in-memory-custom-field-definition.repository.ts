import { CustomFieldDefinition } from '@src/modules/metadata/domain/entities/custom-field-definition.entity';
import { CustomFieldDefinitionRepositoryPort } from '@src/modules/metadata/domain/repositories/custom-field-definition-repository.port';

export class InMemoryCustomFieldDefinitionRepository
  implements CustomFieldDefinitionRepositoryPort
{
  public constructor(private readonly items: CustomFieldDefinition[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findByEntityType(
    entityType: string,
    scopeOrgUnitId?: string,
  ): Promise<CustomFieldDefinition[]> {
    return this.items.filter(
      (item) =>
        item.entityType === entityType &&
        (scopeOrgUnitId ? item.scopeOrgUnitId === scopeOrgUnitId : true),
    );
  }

  public async findById(id: string): Promise<CustomFieldDefinition | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async save(aggregate: CustomFieldDefinition): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
