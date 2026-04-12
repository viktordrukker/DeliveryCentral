import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface WorkflowStateDefinitionProps {
  displayName: string;
  isInitial?: boolean;
  isTerminal?: boolean;
  sequenceNumber: number;
  stateKey: string;
  validationSchema?: Record<string, unknown>;
  workflowDefinitionId: string;
}

export class WorkflowStateDefinition extends AggregateRoot<WorkflowStateDefinitionProps> {
  public static create(props: WorkflowStateDefinitionProps, id?: string): WorkflowStateDefinition {
    return new WorkflowStateDefinition(
      {
        ...props,
        isInitial: props.isInitial ?? false,
        isTerminal: props.isTerminal ?? false,
      },
      id ?? randomUUID(),
    );
  }

  public get stateKey(): string {
    return this.props.stateKey;
  }
}
