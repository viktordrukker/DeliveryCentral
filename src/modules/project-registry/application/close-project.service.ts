import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { ProjectAssignmentRepositoryPort } from '@src/modules/assignments/domain/repositories/project-assignment-repository.port';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { PersonId } from '@src/modules/organization/domain/value-objects/person-id';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';
import { WorkEvidenceRepositoryPort } from '@src/modules/work-evidence/domain/repositories/work-evidence-repository.port';
import { AppConfig } from '@src/shared/config/app-config';

import { Project } from '../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';
import { ProjectId } from '../domain/value-objects/project-id';
import { ProjectLifecycleConflictError } from './project-lifecycle-conflict.error';

interface WorkspendBucket {
  key: string;
  mandays: number;
}

interface ProjectClosureSummary {
  byRole: WorkspendBucket[];
  bySkillset: WorkspendBucket[];
  totalMandays: number;
}

interface CloseProjectResult {
  project: Project;
  workspend: ProjectClosureSummary;
}

interface CloseProjectOptions {
  actorId?: string | null;
  allowActiveAssignmentOverride?: boolean;
  expectedProjectVersion?: number;
  overrideReason?: string;
}

@Injectable()
export class CloseProjectService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly workEvidenceRepository: WorkEvidenceRepositoryPort,
    private readonly personRepository: PersonRepositoryPort,
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly appConfig: AppConfig,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
  ) {}

  public async execute(
    projectId: string,
    options: CloseProjectOptions = {},
  ): Promise<CloseProjectResult> {
    const project = await this.projectRepository.findByProjectId(ProjectId.from(projectId));

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    if (
      typeof options.expectedProjectVersion === 'number' &&
      project.version !== options.expectedProjectVersion
    ) {
      throw new ProjectLifecycleConflictError('Project lifecycle changed. Refresh and try again.');
    }

    if (project.status === 'ACTIVE') {
      const activeAssignments = await this.projectAssignmentRepository.findActiveByProjectId(
        projectId,
        new Date(),
      );

      if (activeAssignments.length > 0 && !options.allowActiveAssignmentOverride) {
        throw new ProjectLifecycleConflictError(
          'Project closure is blocked because active assignments still exist. Use the explicit override flow with a reason to close anyway.',
        );
      }

      if (options.allowActiveAssignmentOverride) {
        const overrideReason = options.overrideReason?.trim();
        if (!overrideReason) {
          throw new BadRequestException('Project closure override reason is required.');
        }
      }
    }

    const evidence = await this.workEvidenceRepository.list({ projectId });
    const workspend = await this.buildWorkspendSummary(evidence);
    const overrideApplied = Boolean(options.allowActiveAssignmentOverride);
    const overrideReason = options.overrideReason?.trim() || undefined;

    project.close();
    await this.projectRepository.save(project);
    this.auditLogger?.record({
      actionType: 'project.closed',
      actorId: options.actorId ?? null,
      category: 'project',
      changeSummary: `Project ${project.name} closed.`,
      details: {
        overrideApplied,
        overrideReason: overrideReason ?? null,
        status: project.status,
        totalMandays: workspend.totalMandays,
      },
      metadata: {
        byRole: workspend.byRole,
        bySkillset: workspend.bySkillset,
        overrideApplied,
        overrideReason: overrideReason ?? null,
        status: project.status,
        totalMandays: workspend.totalMandays,
      },
      targetEntityId: project.projectId.value,
      targetEntityType: 'PROJECT',
    });

    if (overrideApplied) {
      this.auditLogger?.record({
        actionType: 'project.close_overridden',
        actorId: options.actorId ?? null,
        category: 'project',
        changeSummary: `Project ${project.name} closure override applied.`,
        details: {
          overrideReason,
          status: project.status,
          totalMandays: workspend.totalMandays,
        },
        metadata: {
          overrideReason,
          status: project.status,
          totalMandays: workspend.totalMandays,
        },
        targetEntityId: project.projectId.value,
        targetEntityType: 'PROJECT',
      });
    }

    await this.notificationEventTranslator?.projectClosed({
      projectId: project.projectId.value,
      projectName: project.name,
      totalMandays: workspend.totalMandays,
    });

    return {
      project,
      workspend,
    };
  }

  private async buildWorkspendSummary(
    evidenceRecords: WorkEvidence[],
  ): Promise<ProjectClosureSummary> {
    const byRole = new Map<string, number>();
    const bySkillset = new Map<string, number>();
    let totalMandays = 0;

    for (const evidence of evidenceRecords) {
      const minutes = evidence.durationMinutes ?? 0;
      const mandays = this.roundMandays(minutes / this.appConfig.minutesPerManday);

      totalMandays += mandays;

      const person = evidence.personId
        ? await this.personRepository.findByPersonId(PersonId.from(evidence.personId))
        : null;
      const roleKey = person?.role?.trim() || 'UNSPECIFIED';
      byRole.set(roleKey, this.roundMandays((byRole.get(roleKey) ?? 0) + mandays));

      const skillsets = person?.skillsets.filter(Boolean) ?? [];
      const skillsetKeys = skillsets.length > 0 ? skillsets : ['UNSPECIFIED'];
      const skillsetMandays = mandays / skillsetKeys.length;

      for (const skillset of skillsetKeys) {
        bySkillset.set(
          skillset,
          this.roundMandays((bySkillset.get(skillset) ?? 0) + skillsetMandays),
        );
      }
    }

    return {
      byRole: this.mapBuckets(byRole),
      bySkillset: this.mapBuckets(bySkillset),
      totalMandays: this.roundMandays(totalMandays),
    };
  }

  private mapBuckets(source: Map<string, number>): WorkspendBucket[] {
    return Array.from(source.entries())
      .map(([key, mandays]) => ({
        key,
        mandays: this.roundMandays(mandays),
      }))
      .sort((left, right) => right.mandays - left.mandays || left.key.localeCompare(right.key));
  }

  private roundMandays(value: number): number {
    return Number(value.toFixed(2));
  }
}
