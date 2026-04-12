import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { ExternalProjectKey } from '../value-objects/external-project-key';
import { ExternalSystemType } from '../value-objects/external-system-type';
import { ProjectId } from '../value-objects/project-id';

interface ProjectExternalLinkProps {
  archivedAt?: Date;
  connectionKey?: string;
  externalProjectKey: ExternalProjectKey;
  externalProjectName?: string;
  externalUrl?: string;
  projectId: ProjectId;
  providerEnvironment?: string;
  systemType: ExternalSystemType;
}

export class ProjectExternalLink extends AggregateRoot<ProjectExternalLinkProps> {
  public static create(props: ProjectExternalLinkProps, id?: string): ProjectExternalLink {
    return new ProjectExternalLink(props, id ?? randomUUID());
  }

  public archive(archivedAt: Date): void {
    this.props.archivedAt = archivedAt;
  }

  public enrich(details: {
    connectionKey?: string;
    externalProjectName?: string;
    externalUrl?: string;
    providerEnvironment?: string;
  }): void {
    this.props.connectionKey = details.connectionKey ?? this.props.connectionKey;
    this.props.externalProjectName = details.externalProjectName ?? this.props.externalProjectName;
    this.props.externalUrl = details.externalUrl ?? this.props.externalUrl;
    this.props.providerEnvironment =
      details.providerEnvironment ?? this.props.providerEnvironment;
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  public get connectionKey(): string | undefined {
    return this.props.connectionKey;
  }

  public get externalProjectKey(): ExternalProjectKey {
    return this.props.externalProjectKey;
  }

  public get externalProjectName(): string | undefined {
    return this.props.externalProjectName;
  }

  public get externalUrl(): string | undefined {
    return this.props.externalUrl;
  }

  public get projectId(): ProjectId {
    return this.props.projectId;
  }

  public get providerEnvironment(): string | undefined {
    return this.props.providerEnvironment;
  }

  public get systemType(): ExternalSystemType {
    return this.props.systemType;
  }
}
