import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { WorkflowStateDefinition } from './workflow-state-definition.entity';

export type WorkflowDefinitionStatus = 'ACTIVE' | 'DRAFT' | 'RETIRED';

interface WorkflowDefinitionProps {
  archivedAt?: Date;
  definition?: Record<string, unknown>;
  displayName: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  entityType: string;
  status?: WorkflowDefinitionStatus;
  version: number;
  workflowKey: string;
}

export class WorkflowDefinition extends AggregateRoot<WorkflowDefinitionProps> {
  private readonly stateDefinitions: WorkflowStateDefinition[] = [];

  public static create(props: WorkflowDefinitionProps, id?: string): WorkflowDefinition {
    return new WorkflowDefinition(
      {
        ...props,
        status: props.status ?? 'DRAFT',
      },
      id ?? randomUUID(),
    );
  }

  public addState(state: WorkflowStateDefinition): void {
    this.stateDefinitions.push(state);
  }

  public get entityType(): string {
    return this.props.entityType;
  }

  public get states(): WorkflowStateDefinition[] {
    return [...this.stateDefinitions];
  }

  public get version(): number {
    return this.props.version;
  }

  public get workflowKey(): string {
    return this.props.workflowKey;
  }
}
