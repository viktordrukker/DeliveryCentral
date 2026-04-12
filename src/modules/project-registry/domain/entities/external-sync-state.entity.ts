import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type ExternalSyncStatus = 'FAILED' | 'IDLE' | 'PARTIAL' | 'RUNNING' | 'SUCCEEDED';

interface ExternalSyncStateProps {
  lastError?: string;
  lastPayloadFingerprint?: string;
  lastSuccessfulSyncedAt?: Date;
  lastSyncedAt?: Date;
  projectExternalLinkId: string;
  syncStatus: ExternalSyncStatus;
}

export class ExternalSyncState extends AggregateRoot<ExternalSyncStateProps> {
  public static create(props: ExternalSyncStateProps, id?: string): ExternalSyncState {
    return new ExternalSyncState(props, id ?? randomUUID());
  }

  public mark(update: {
    lastError?: string;
    lastPayloadFingerprint?: string;
    lastSuccessfulSyncedAt?: Date;
    lastSyncedAt?: Date;
    syncStatus: ExternalSyncStatus;
  }): void {
    this.props.lastError = update.lastError;
    this.props.lastPayloadFingerprint =
      update.lastPayloadFingerprint ?? this.props.lastPayloadFingerprint;
    this.props.lastSuccessfulSyncedAt =
      update.lastSuccessfulSyncedAt ?? this.props.lastSuccessfulSyncedAt;
    this.props.lastSyncedAt = update.lastSyncedAt ?? this.props.lastSyncedAt;
    this.props.syncStatus = update.syncStatus;
  }

  public get projectExternalLinkId(): string {
    return this.props.projectExternalLinkId;
  }

  public get lastError(): string | undefined {
    return this.props.lastError;
  }

  public get lastPayloadFingerprint(): string | undefined {
    return this.props.lastPayloadFingerprint;
  }

  public get lastSuccessfulSyncedAt(): Date | undefined {
    return this.props.lastSuccessfulSyncedAt;
  }

  public get lastSyncedAt(): Date | undefined {
    return this.props.lastSyncedAt;
  }

  public get syncStatus(): ExternalSyncStatus {
    return this.props.syncStatus;
  }
}
