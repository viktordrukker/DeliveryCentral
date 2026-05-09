import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import {
  UndoActionExecutor,
  UndoActionRow,
} from '@src/modules/undo/application/undo-action-executor.registry';

import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';
import { ProjectId } from '../domain/value-objects/project-id';

// HD-8 / Chunk 8.4a — undo executor for `project.close`. Reverses a
// CLOSE by calling the privileged `restoreFromClose()` domain method
// (CLOSED is semi-terminal in the public state machine; the safety
// boundary is the undo token itself). Restores to ACTIVE with an
// audit row so the rollback is traceable.
@Injectable()
export class ProjectCloseUndoExecutor implements UndoActionExecutor {
  public readonly actionType = 'project.close';
  private readonly logger = new Logger(ProjectCloseUndoExecutor.name);

  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(row: UndoActionRow): Promise<void> {
    const project = await this.projectRepository.findByProjectId(
      ProjectId.from(row.entityId),
    );
    if (!project) {
      throw new NotFoundException(`Project ${row.entityId} not found.`);
    }

    if (project.status !== 'CLOSED') {
      // Idempotency-friendly: a concurrent retry already restored.
      this.logger.debug(
        `Project ${row.entityId} is in status ${project.status}; restore is a no-op.`,
      );
      return;
    }

    project.restoreFromClose();
    await this.projectRepository.save(project);

    this.auditLogger?.record({
      actionType: 'project.close.undone',
      actorId: row.actorId,
      category: 'project',
      changeSummary: `Closure of project ${row.entityId} reversed by undo token (restored to ACTIVE).`,
      details: {
        undoActionId: row.id,
        previousStatus: 'CLOSED',
        currentStatus: 'ACTIVE',
      },
      metadata: {
        undoActionId: row.id,
      },
      targetEntityId: row.entityId,
      targetEntityType: 'PROJECT',
    });
  }
}
