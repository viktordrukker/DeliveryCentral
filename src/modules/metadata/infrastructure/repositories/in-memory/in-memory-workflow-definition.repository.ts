import { WorkflowDefinition } from '@src/modules/metadata/domain/entities/workflow-definition.entity';
import { WorkflowDefinitionRepositoryPort } from '@src/modules/metadata/domain/repositories/workflow-definition-repository.port';

export class InMemoryWorkflowDefinitionRepository
  implements WorkflowDefinitionRepositoryPort
{
  public constructor(private readonly items: WorkflowDefinition[] = []) {}

  public async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  public async findById(id: string): Promise<WorkflowDefinition | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  public async findLatestByWorkflowKey(
    entityType: string,
    workflowKey: string,
  ): Promise<WorkflowDefinition | null> {
    const matches = this.items
      .filter((item) => item.entityType === entityType && item.workflowKey === workflowKey)
      .sort((left, right) => right.version - left.version);

    return matches[0] ?? null;
  }

  public async save(aggregate: WorkflowDefinition): Promise<void> {
    const index = this.items.findIndex((item) => item.id === aggregate.id);
    if (index >= 0) {
      this.items.splice(index, 1, aggregate);
      return;
    }

    this.items.push(aggregate);
  }
}
