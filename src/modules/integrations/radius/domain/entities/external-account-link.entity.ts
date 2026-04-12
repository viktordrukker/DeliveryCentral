import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface ExternalAccountLinkProps {
  accountPresenceState?: string;
  externalAccountId: string;
  externalDisplayName?: string;
  externalEmail?: string;
  externalUsername?: string;
  lastSeenAt?: Date;
  matchedByStrategy?: string;
  personId?: string;
  provider: string;
  sourceType: string;
  sourceUpdatedAt?: Date;
}

export class ExternalAccountLink extends AggregateRoot<ExternalAccountLinkProps> {
  public static create(
    props: ExternalAccountLinkProps,
    id: string = randomUUID(),
  ): ExternalAccountLink {
    return new ExternalAccountLink(props, id);
  }

  public reconcile(update: {
    accountPresenceState?: string;
    externalDisplayName?: string;
    externalEmail?: string;
    externalUsername?: string;
    lastSeenAt: Date;
    matchedByStrategy?: string;
    personId?: string;
    sourceType: string;
    sourceUpdatedAt?: Date;
  }): void {
    this.props.accountPresenceState = update.accountPresenceState;
    this.props.externalDisplayName = update.externalDisplayName;
    this.props.externalEmail = update.externalEmail;
    this.props.externalUsername = update.externalUsername;
    this.props.lastSeenAt = update.lastSeenAt;
    this.props.matchedByStrategy = update.matchedByStrategy;
    this.props.personId = update.personId;
    this.props.sourceType = update.sourceType;
    this.props.sourceUpdatedAt = update.sourceUpdatedAt;
  }

  public get accountPresenceState(): string | undefined {
    return this.props.accountPresenceState;
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
}
