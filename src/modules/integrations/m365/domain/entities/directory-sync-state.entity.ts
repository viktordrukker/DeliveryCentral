import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

type DirectorySyncStatus = 'FAILED' | 'IDLE' | 'RUNNING' | 'SUCCEEDED';

interface DirectorySyncStateProps {
  lastError?: string;
  lastStatus: DirectorySyncStatus;
  lastSyncedAt?: Date;
  provider: string;
  resourceType: string;
  scopeKey: string;
}

export class DirectorySyncState extends AggregateRoot<DirectorySyncStateProps> {
  public static create(props: DirectorySyncStateProps, id: string = randomUUID()) {
    return new DirectorySyncState(props, id);
  }

  public mark(update: {
    lastError?: string;
    lastStatus: DirectorySyncStatus;
    lastSyncedAt?: Date;
  }): void {
    this.props.lastError = update.lastError;
    this.props.lastStatus = update.lastStatus;
    this.props.lastSyncedAt = update.lastSyncedAt ?? this.props.lastSyncedAt;
  }

  public get provider(): string {
    return this.props.provider;
  }

  public get resourceType(): string {
    return this.props.resourceType;
  }

  public get scopeKey(): string {
    return this.props.scopeKey;
  }

  public get lastStatus(): DirectorySyncStatus {
    return this.props.lastStatus;
  }

  public get lastSyncedAt(): Date | undefined {
    return this.props.lastSyncedAt;
  }

  public get lastError(): string | undefined {
    return this.props.lastError;
  }
}
