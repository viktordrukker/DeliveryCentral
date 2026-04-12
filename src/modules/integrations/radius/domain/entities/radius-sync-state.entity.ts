import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

type RadiusSyncStatus = 'FAILED' | 'IDLE' | 'RUNNING' | 'SUCCEEDED';

interface RadiusSyncStateProps {
  lastError?: string;
  lastStatus: RadiusSyncStatus;
  lastSyncedAt?: Date;
  provider: string;
  resourceType: string;
  scopeKey: string;
}

export class RadiusSyncState extends AggregateRoot<RadiusSyncStateProps> {
  public static create(props: RadiusSyncStateProps, id: string = randomUUID()) {
    return new RadiusSyncState(props, id);
  }

  public mark(update: {
    lastError?: string;
    lastStatus: RadiusSyncStatus;
    lastSyncedAt?: Date;
  }): void {
    this.props.lastError = update.lastError;
    this.props.lastStatus = update.lastStatus;
    this.props.lastSyncedAt = update.lastSyncedAt ?? this.props.lastSyncedAt;
  }

  public get lastError(): string | undefined {
    return this.props.lastError;
  }

  public get lastStatus(): RadiusSyncStatus {
    return this.props.lastStatus;
  }

  public get lastSyncedAt(): Date | undefined {
    return this.props.lastSyncedAt;
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
}
