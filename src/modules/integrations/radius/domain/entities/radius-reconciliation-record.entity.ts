import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type RadiusReconciliationCategory =
  | 'AMBIGUOUS'
  | 'MATCHED'
  | 'PRESENCE_DRIFT'
  | 'UNMATCHED';

interface RadiusReconciliationRecordProps {
  accountPresenceState?: string;
  candidatePersonIds: string[];
  category: RadiusReconciliationCategory;
  externalAccountId: string;
  externalDisplayName?: string;
  externalEmail?: string;
  externalUsername?: string;
  lastEvaluatedAt: Date;
  lastSeenAt?: Date;
  matchedByStrategy?: string;
  personId?: string;
  provider: string;
  sourceType: string;
  sourceUpdatedAt?: Date;
  summary: string;
}

export class RadiusReconciliationRecord extends AggregateRoot<RadiusReconciliationRecordProps> {
  public static create(
    props: RadiusReconciliationRecordProps,
    id: string = randomUUID(),
  ): RadiusReconciliationRecord {
    return new RadiusReconciliationRecord(
      {
        ...props,
        candidatePersonIds: [...new Set(props.candidatePersonIds)],
      },
      id,
    );
  }

  public revise(update: RadiusReconciliationRecordProps): void {
    this.props.accountPresenceState = update.accountPresenceState;
    this.props.candidatePersonIds = [...new Set(update.candidatePersonIds)];
    this.props.category = update.category;
    this.props.externalAccountId = update.externalAccountId;
    this.props.externalDisplayName = update.externalDisplayName;
    this.props.externalEmail = update.externalEmail;
    this.props.externalUsername = update.externalUsername;
    this.props.lastEvaluatedAt = update.lastEvaluatedAt;
    this.props.lastSeenAt = update.lastSeenAt;
    this.props.matchedByStrategy = update.matchedByStrategy;
    this.props.personId = update.personId;
    this.props.provider = update.provider;
    this.props.sourceType = update.sourceType;
    this.props.sourceUpdatedAt = update.sourceUpdatedAt;
    this.props.summary = update.summary;
  }

  public get accountPresenceState(): string | undefined {
    return this.props.accountPresenceState;
  }

  public get candidatePersonIds(): string[] {
    return [...this.props.candidatePersonIds];
  }

  public get category(): RadiusReconciliationCategory {
    return this.props.category;
  }

  public get externalAccountId(): string {
    return this.props.externalAccountId;
  }

  public get externalDisplayName(): string | undefined {
    return this.props.externalDisplayName;
  }

  public get externalEmail(): string | undefined {
    return this.props.externalEmail;
  }

  public get externalUsername(): string | undefined {
    return this.props.externalUsername;
  }

  public get lastEvaluatedAt(): Date {
    return this.props.lastEvaluatedAt;
  }

  public get lastSeenAt(): Date | undefined {
    return this.props.lastSeenAt;
  }

  public get matchedByStrategy(): string | undefined {
    return this.props.matchedByStrategy;
  }

  public get personId(): string | undefined {
    return this.props.personId;
  }

  public get provider(): string {
    return this.props.provider;
  }

  public get sourceType(): string {
    return this.props.sourceType;
  }

  public get sourceUpdatedAt(): Date | undefined {
    return this.props.sourceUpdatedAt;
  }

  public get summary(): string {
    return this.props.summary;
  }
}
