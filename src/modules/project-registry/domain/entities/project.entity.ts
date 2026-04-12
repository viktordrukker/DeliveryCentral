import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

import { ProjectId } from '../value-objects/project-id';

export type ProjectStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'CLOSED'
  | 'COMPLETED'
  | 'DRAFT'
  | 'ON_HOLD';

interface ProjectProps {
  archivedAt?: Date;
  description?: string;
  endsOn?: Date;
  name: string;
  projectManagerId?: PersonId;
  projectCode: string;
  startsOn?: Date;
  status?: ProjectStatus;
  version?: number;
}

export class Project extends AggregateRoot<ProjectProps> {
  public static create(props: ProjectProps, projectId?: ProjectId): Project {
    return new Project(
      {
        ...props,
        status: props.status ?? 'DRAFT',
      },
      projectId?.value ?? randomUUID(),
    );
  }

  public archive(archivedAt: Date): void {
    this.props.archivedAt = archivedAt;
    this.props.status = 'ARCHIVED';
  }

  public activate(): void {
    if (this.status !== 'DRAFT') {
      throw new Error('Project can only be activated from DRAFT.');
    }

    this.props.status = 'ACTIVE';
  }

  public close(): void {
    if (this.status !== 'ACTIVE') {
      throw new Error('Project can only be closed from ACTIVE.');
    }

    this.props.status = 'CLOSED';
  }

  public enrich(details: { description?: string; name?: string; status?: ProjectStatus }): void {
    this.props.description = details.description ?? this.props.description;
    this.props.name = details.name ?? this.props.name;
    this.props.status = details.status ?? this.props.status;
  }

  public get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  public get description(): string | undefined {
    return this.props.description;
  }

  public get name(): string {
    return this.props.name;
  }

  public get startsOn(): Date | undefined {
    return this.props.startsOn;
  }

  public get endsOn(): Date | undefined {
    return this.props.endsOn;
  }

  public get projectManagerId(): PersonId | undefined {
    return this.props.projectManagerId;
  }

  public get projectCode(): string {
    return this.props.projectCode;
  }

  public get projectId(): ProjectId {
    return ProjectId.from(this.id);
  }

  public get status(): ProjectStatus {
    return this.props.status ?? 'DRAFT';
  }

  public get version(): number {
    return this.props.version ?? 1;
  }

  public synchronizeVersion(version: number): void {
    this.props.version = version;
  }
}
