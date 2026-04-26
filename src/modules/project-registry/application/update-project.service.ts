import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectId } from '../domain/value-objects/project-id';
import { Project, ProjectStatus } from '../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';

interface UpdateProjectActor {
  personId?: string;
  roles: string[];
}

interface UpdateProjectCommand {
  description?: string;
  name?: string;
  projectId: string;
  status?: ProjectStatus;
  projectManagerId?: string;
  deliveryManagerId?: string;
  actor?: UpdateProjectActor;
}

const PRIVILEGED_ROLES = ['director', 'admin'];

@Injectable()
export class UpdateProjectService {
  public constructor(
    private readonly repository: ProjectRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  public async execute(command: UpdateProjectCommand): Promise<Project> {
    const id = ProjectId.from(command.projectId);
    const project = await this.repository.findByProjectId(id);

    if (!project) {
      throw new NotFoundException('Project does not exist.');
    }

    // Ownership gate: director/admin always allowed; other callers must be the current PM.
    const actor = command.actor;
    const actorIsPrivileged =
      actor?.roles.some((role) => PRIVILEGED_ROLES.includes(role)) ?? false;
    const actorIsCurrentPm =
      actor?.personId !== undefined &&
      project.projectManagerId?.value === actor.personId;

    if (actor && !actorIsPrivileged && !actorIsCurrentPm) {
      throw new ForbiddenException(
        'Only the project PM, a director, or an admin can edit this project.',
      );
    }

    // PM reassignment is gated by OrgConfig pmReassignmentPolicy.
    const isPmReassignment =
      command.projectManagerId !== undefined &&
      command.projectManagerId !== project.projectManagerId?.value;
    if (isPmReassignment) {
      const orgConfig = await this.prisma.organizationConfig.findUnique({
        where: { id: 'default' },
      });
      const policy = orgConfig?.pmReassignmentPolicy ?? 'pm-or-director-or-admin';
      if (policy === 'director-approval' && !actorIsPrivileged) {
        throw new ForbiddenException(
          'Organization policy requires director approval for PM reassignment.',
        );
      }
    }

    // Update core domain fields via repository.
    project.enrich({
      description: command.description,
      name: command.name,
      status: command.status,
    });
    await this.repository.save(project);

    // Manager reassignments are DB-level fields not covered by the domain entity today;
    // we persist them via Prisma directly + audit-log the change.
    if (command.projectManagerId !== undefined || command.deliveryManagerId !== undefined) {
      const prior = await this.prisma.project.findUnique({
        where: { id: command.projectId },
        select: { projectManagerId: true, deliveryManagerId: true },
      });
      await this.prisma.project.update({
        where: { id: command.projectId },
        data: {
          ...(command.projectManagerId !== undefined
            ? { projectManagerId: command.projectManagerId, leadPmPersonId: command.projectManagerId }
            : {}),
          ...(command.deliveryManagerId !== undefined
            ? { deliveryManagerId: command.deliveryManagerId }
            : {}),
        },
      });
      if (isPmReassignment) {
        this.auditLogger.record({
          actionType: 'project.pm-reassigned',
          actorId: actor?.personId ?? null,
          category: 'project',
          subjectId: command.projectId,
          targetEntityType: 'Project',
          targetEntityId: command.projectId,
          metadata: {
            fromPersonId: prior?.projectManagerId ?? null,
            toPersonId: command.projectManagerId,
          },
          details: {
            fromPersonId: prior?.projectManagerId ?? null,
            toPersonId: command.projectManagerId,
          },
        });
      }
      if (
        command.deliveryManagerId !== undefined &&
        command.deliveryManagerId !== prior?.deliveryManagerId
      ) {
        this.auditLogger.record({
          actionType: 'project.dm-reassigned',
          actorId: actor?.personId ?? null,
          category: 'project',
          subjectId: command.projectId,
          targetEntityType: 'Project',
          targetEntityId: command.projectId,
          metadata: {
            fromPersonId: prior?.deliveryManagerId ?? null,
            toPersonId: command.deliveryManagerId,
          },
          details: {
            fromPersonId: prior?.deliveryManagerId ?? null,
            toPersonId: command.deliveryManagerId,
          },
        });
      }
    }

    return project;
  }
}
