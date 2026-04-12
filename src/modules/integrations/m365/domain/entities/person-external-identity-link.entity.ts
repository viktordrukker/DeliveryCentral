import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

interface PersonExternalIdentityLinkProps {
  externalManagerUserId?: string;
  externalPrincipalName?: string;
  externalUserId: string;
  lastSeenAt?: Date;
  matchedByStrategy: string;
  personId: string;
  provider: string;
  resolvedManagerPersonId?: string;
  sourceAccountEnabled?: boolean;
  sourceDepartment?: string;
  sourceJobTitle?: string;
  sourceUpdatedAt?: Date;
}

export class PersonExternalIdentityLink extends AggregateRoot<PersonExternalIdentityLinkProps> {
  public static create(
    props: PersonExternalIdentityLinkProps,
    id: string = randomUUID(),
  ): PersonExternalIdentityLink {
    return new PersonExternalIdentityLink(props, id);
  }

  public reconcile(update: {
    externalManagerUserId?: string;
    externalPrincipalName?: string;
    lastSeenAt: Date;
    matchedByStrategy: string;
    resolvedManagerPersonId?: string;
    sourceAccountEnabled?: boolean;
    sourceDepartment?: string;
    sourceJobTitle?: string;
    sourceUpdatedAt?: Date;
  }): void {
    this.props.externalManagerUserId = update.externalManagerUserId;
    this.props.externalPrincipalName = update.externalPrincipalName;
    this.props.lastSeenAt = update.lastSeenAt;
    this.props.matchedByStrategy = update.matchedByStrategy;
    this.props.resolvedManagerPersonId = update.resolvedManagerPersonId;
    this.props.sourceAccountEnabled = update.sourceAccountEnabled;
    this.props.sourceDepartment = update.sourceDepartment;
    this.props.sourceJobTitle = update.sourceJobTitle;
    this.props.sourceUpdatedAt = update.sourceUpdatedAt;
  }

  public get personId(): string {
    return this.props.personId;
  }

  public get provider(): string {
    return this.props.provider;
  }

  public get externalUserId(): string {
    return this.props.externalUserId;
  }

  public get externalPrincipalName(): string | undefined {
    return this.props.externalPrincipalName;
  }

  public get matchedByStrategy(): string {
    return this.props.matchedByStrategy;
  }

  public get sourceDepartment(): string | undefined {
    return this.props.sourceDepartment;
  }

  public get sourceJobTitle(): string | undefined {
    return this.props.sourceJobTitle;
  }

  public get sourceAccountEnabled(): boolean | undefined {
    return this.props.sourceAccountEnabled;
  }

  public get externalManagerUserId(): string | undefined {
    return this.props.externalManagerUserId;
  }

  public get resolvedManagerPersonId(): string | undefined {
    return this.props.resolvedManagerPersonId;
  }

  public get sourceUpdatedAt(): Date | undefined {
    return this.props.sourceUpdatedAt;
  }

  public get lastSeenAt(): Date | undefined {
    return this.props.lastSeenAt;
  }
}
