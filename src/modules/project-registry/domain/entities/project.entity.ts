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

export type EngagementModel = 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MANAGED_SERVICE' | 'INTERNAL';
export type ProjectPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface ProjectProps {
  archivedAt?: Date;
  clientId?: string;
  deliveryManagerId?: PersonId;
  description?: string;
  domain?: string;
  endsOn?: Date;
  engagementModel?: EngagementModel;
  lessonsLearned?: string;
  name: string;
  outcomeRating?: string;
  priority?: ProjectPriority;
  projectCode: string;
  projectManagerId?: PersonId;
  projectType?: string;
  startsOn?: Date;
  status?: ProjectStatus;
  tags?: string[];
  techStack?: string[];
  version?: number;
  wouldStaffSameWay?: boolean;
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

  public enrich(details: {
    clientId?: string;
    deliveryManagerId?: PersonId;
    description?: string;
    domain?: string;
    engagementModel?: EngagementModel;
    name?: string;
    priority?: ProjectPriority;
    projectType?: string;
    status?: ProjectStatus;
    tags?: string[];
    techStack?: string[];
  }): void {
    if (details.clientId !== undefined) this.props.clientId = details.clientId;
    if (details.deliveryManagerId !== undefined) this.props.deliveryManagerId = details.deliveryManagerId;
    if (details.description !== undefined) this.props.description = details.description;
    if (details.domain !== undefined) this.props.domain = details.domain;
    if (details.engagementModel !== undefined) this.props.engagementModel = details.engagementModel;
    if (details.name !== undefined) this.props.name = details.name;
    if (details.priority !== undefined) this.props.priority = details.priority;
    if (details.projectType !== undefined) this.props.projectType = details.projectType;
    if (details.status !== undefined) this.props.status = details.status;
    if (details.tags !== undefined) this.props.tags = details.tags;
    if (details.techStack !== undefined) this.props.techStack = details.techStack;
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

  public get clientId(): string | undefined { return this.props.clientId; }
  public get deliveryManagerId(): PersonId | undefined { return this.props.deliveryManagerId; }
  public get domain(): string | undefined { return this.props.domain; }
  public get engagementModel(): EngagementModel | undefined { return this.props.engagementModel; }
  public get lessonsLearned(): string | undefined { return this.props.lessonsLearned; }
  public get outcomeRating(): string | undefined { return this.props.outcomeRating; }
  public get priority(): ProjectPriority | undefined { return this.props.priority; }
  public get projectType(): string | undefined { return this.props.projectType; }
  public get tags(): string[] { return this.props.tags ?? []; }
  public get techStack(): string[] { return this.props.techStack ?? []; }
  public get wouldStaffSameWay(): boolean | undefined { return this.props.wouldStaffSameWay; }

  public get version(): number {
    return this.props.version ?? 1;
  }

  public synchronizeVersion(version: number): void {
    this.props.version = version;
  }

  public recordOutcome(rating: string, lessons?: string, wouldStaffSame?: boolean): void {
    this.props.outcomeRating = rating;
    this.props.lessonsLearned = lessons;
    this.props.wouldStaffSameWay = wouldStaffSame;
  }
}
