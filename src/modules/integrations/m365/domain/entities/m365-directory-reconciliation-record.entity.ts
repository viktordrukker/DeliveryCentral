import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

export type M365ReconciliationCategory =
  | 'AMBIGUOUS'
  | 'MATCHED'
  | 'STALE_CONFLICT'
  | 'UNMATCHED';

interface M365DirectoryReconciliationRecordProps {
  category: M365ReconciliationCategory;
  candidatePersonIds: string[];
  externalDisplayName?: string;
  externalEmail?: string;
  externalPrincipalName?: string;
  externalUserId: string;
  lastEvaluatedAt: Date;
  lastSeenAt?: Date;
  matchedByStrategy?: string;
  personId?: string;
  provider: string;
  resolvedManagerPersonId?: string;
  sourceAccountEnabled?: boolean;
  sourceDepartment?: string;
  sourceJobTitle?: string;
  sourceUpdatedAt?: Date;
  summary: string;
}

export class M365DirectoryReconciliationRecord extends AggregateRoot<M365DirectoryReconciliationRecordProps> {
  public static create(
    props: M365DirectoryReconciliationRecordProps,
    id: string = randomUUID(),
  ): M365DirectoryReconciliationRecord {
    return new M365DirectoryReconciliationRecord(
      {
        ...props,
        candidatePersonIds: [...new Set(props.candidatePersonIds)],
      },
      id,
    );
  }

  public revise(update: M365DirectoryReconciliationRecordProps): void {
    this.props.category = update.category;
    this.props.candidatePersonIds = [...new Set(update.candidatePersonIds)];
    this.props.externalDisplayName = update.externalDisplayName;
    this.props.externalEmail = update.externalEmail;
    this.props.externalPrincipalName = update.externalPrincipalName;
    this.props.externalUserId = update.externalUserId;
    this.props.lastEvaluatedAt = update.lastEvaluatedAt;
    this.props.lastSeenAt = update.lastSeenAt;
    this.props.matchedByStrategy = update.matchedByStrategy;
    this.props.personId = update.personId;
    this.props.provider = update.provider;
    this.props.resolvedManagerPersonId = update.resolvedManagerPersonId;
    this.props.sourceAccountEnabled = update.sourceAccountEnabled;
    this.props.sourceDepartment = update.sourceDepartment;
    this.props.sourceJobTitle = update.sourceJobTitle;
    this.props.sourceUpdatedAt = update.sourceUpdatedAt;
    this.props.summary = update.summary;
  }

  public get category(): M365ReconciliationCategory {
    return this.props.category;
  }

  public get candidatePersonIds(): string[] {
    return [...this.props.candidatePersonIds];
  }

  public get externalDisplayName(): string | undefined {
    return this.props.externalDisplayName;
  }

  public get externalEmail(): string | undefined {
    return this.props.externalEmail;
  }

  public get externalPrincipalName(): string | undefined {
    return this.props.externalPrincipalName;
  }

  public get externalUserId(): string {
    return this.props.externalUserId;
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

  public get resolvedManagerPersonId(): string | undefined {
    return this.props.resolvedManagerPersonId;
  }

  public get sourceAccountEnabled(): boolean | undefined {
    return this.props.sourceAccountEnabled;
  }

  public get sourceDepartment(): string | undefined {
    return this.props.sourceDepartment;
  }

  public get sourceJobTitle(): string | undefined {
    return this.props.sourceJobTitle;
  }

  public get sourceUpdatedAt(): Date | undefined {
    return this.props.sourceUpdatedAt;
  }

  public get summary(): string {
    return this.props.summary;
  }
}
