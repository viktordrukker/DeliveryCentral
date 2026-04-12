import { RepositoryPort } from '@src/shared/domain/repository-port';

import { WorkflowDefinition } from '../entities/workflow-definition.entity';

export interface WorkflowDefinitionRepositoryPort extends RepositoryPort<WorkflowDefinition> {
  findLatestByWorkflowKey(
    entityType: string,
    workflowKey: string,
  ): Promise<WorkflowDefinition | null>;
}
