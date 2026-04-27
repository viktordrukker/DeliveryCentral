import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

import { Project } from '../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';
import { ProjectId } from '../domain/value-objects/project-id';

@Injectable()
export class ActivateProjectService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findByProjectId(ProjectId.from(projectId));

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    project.activate();
    await this.projectRepository.save(project);
    this.auditLogger?.record({
      actionType: 'project.activated',
      actorId: null,
      category: 'project',
      changeSummary: `Project ${project.name} activated.`,
      details: {
        projectCode: project.projectCode,
        status: project.status,
      },
      metadata: {
        projectCode: project.projectCode,
        status: project.status,
      },
      targetEntityId: project.projectId.value,
      targetEntityType: 'PROJECT',
    });
    await this.notificationEventTranslator?.projectActivated({
      projectId: project.projectId.value,
      projectName: project.name,
    });

    return project;
  }
}
