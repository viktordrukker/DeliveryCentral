import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';

import { Project } from '../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';

interface CreateProjectInput {
  clientId?: string;
  deliveryManagerId?: string;
  description?: string;
  domain?: string;
  engagementModel?: string;
  name: string;
  plannedEndDate?: string;
  priority?: string;
  projectCode?: string;
  projectManagerId?: string;
  projectType?: string;
  startDate?: string;
  tags?: string[];
  techStack?: string[];
}

@Injectable()
export class CreateProjectService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly personRepository?: PersonRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(input: CreateProjectInput): Promise<Project> {
    if (this.personRepository && !input.startDate) {
      throw new BadRequestException('Project start date is required.');
    }

    if (!input.projectManagerId && this.personRepository) {
      throw new BadRequestException('Project manager is required.');
    }

    const startDate = input.startDate ? new Date(input.startDate) : undefined;
    const plannedEndDate = input.plannedEndDate ? new Date(input.plannedEndDate) : undefined;
    if (startDate && Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Project start date is invalid.');
    }

    if (plannedEndDate && Number.isNaN(plannedEndDate.getTime())) {
      throw new BadRequestException('Project planned end date is invalid.');
    }

    if (plannedEndDate && startDate && plannedEndDate < startDate) {
      throw new BadRequestException('Project planned end date must be on or after the start date.');
    }

    if (input.projectManagerId) {
      if (!this.personRepository) {
        throw new InternalServerErrorException('Project manager validation is unavailable.');
      }

      const manager = await this.personRepository.findByPersonId(
        PersonId.from(input.projectManagerId),
      );
      if (!manager) {
        throw new NotFoundException('Project manager does not exist.');
      }
    }

    const projectCode = input.projectCode ?? this.generateProjectCode();
    const existing = await this.projectRepository.findByProjectCode(projectCode);
    if (existing) {
      throw new ConflictException('Project code already exists.');
    }

    const project = Project.create({
      clientId: input.clientId,
      deliveryManagerId: input.deliveryManagerId ? PersonId.from(input.deliveryManagerId) : undefined,
      description: input.description,
      domain: input.domain,
      endsOn: plannedEndDate,
      engagementModel: input.engagementModel as any,
      name: input.name,
      priority: (input.priority as any) ?? 'MEDIUM',
      projectCode,
      projectManagerId: input.projectManagerId
        ? PersonId.from(input.projectManagerId)
        : undefined,
      projectType: input.projectType,
      startsOn: startDate,
      status: 'DRAFT',
      tags: input.tags,
      techStack: input.techStack,
    });

    await this.projectRepository.save(project);
    this.auditLogger?.record({
      actionType: 'project.created',
      actorId: null,
      category: 'project',
      changeSummary: `Project ${project.name} created in draft state.`,
      details: {
        projectManagerId: input.projectManagerId ?? null,
        projectStatus: project.status,
      },
      metadata: {
        projectCode: project.projectCode,
        projectManagerId: input.projectManagerId ?? null,
        projectStatus: project.status,
      },
      targetEntityId: project.projectId.value,
      targetEntityType: 'PROJECT',
    });

    return project;
  }

  private generateProjectCode(): string {
    return `PRJ-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }
}
