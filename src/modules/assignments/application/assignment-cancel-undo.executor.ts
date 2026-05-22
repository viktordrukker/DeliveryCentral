import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import {
  UndoActionExecutor,
  UndoActionRow,
} from '@src/modules/undo/application/undo-action-executor.registry';

import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AssignmentId } from '../domain/value-objects/assignment-id';
import { AssignmentStatusValue } from '../domain/value-objects/assignment-status';

interface AssignmentCancelInverse {
  previousStatus: AssignmentStatusValue;
  reason: string | null;
}

// HD-8 / Chunk 8.2 — undo executor for `assignment.cancel`. Bypasses
// the public state machine (CANCELLED is terminal there) via the
// privileged `restoreFromCancellation` domain method; the safety
// boundary is the undo token itself (TTL-bounded, single actor,
// idempotent at the UndoService layer).
//
// History + audit: writes a fresh `AssignmentHistory` row + AuditLog
// entry tagged `assignment.cancel.undone` so the restore is traceable
// on the assignment detail page and distinguishable from a fresh
// status change in audit queries.
@Injectable()
export class AssignmentCancelUndoExecutor implements UndoActionExecutor {
  public readonly actionType = 'assignment.cancel';
  private readonly logger = new Logger(AssignmentCancelUndoExecutor.name);

  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(row: UndoActionRow): Promise<void> {
    const inverse = this.parseInverse(row.inversePayload);
    if (!inverse) {
      throw new BadRequestException(
        `Undo row ${row.id} has malformed inversePayload for actionType=${this.actionType}.`,
      );
    }

    const assignment = await this.projectAssignmentRepository.findByAssignmentId(
      AssignmentId.from(row.entityId),
    );
    if (!assignment) {
      throw new NotFoundException(`Assignment ${row.entityId} not found.`);
    }

    if (assignment.status.value !== 'CANCELLED') {
      // Idempotency-friendly: if the row has already been restored
      // by a concurrent retry, treat as success.
      this.logger.debug(
        `Assignment ${row.entityId} is in status ${assignment.status.value}; restore is a no-op.`,
      );
      return;
    }

    const previousStatusBeforeRestore = assignment.status.value;
    assignment.restoreFromCancellation(inverse.previousStatus);

    const history = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: `Undo of cancellation${inverse.reason ? ` (${inverse.reason})` : ''}`,
      changeType: 'STATUS_RESTORED',
      changedByPersonId: row.actorId,
      newSnapshot: { status: assignment.status.value },
      occurredAt: new Date(),
      previousSnapshot: {
        status: previousStatusBeforeRestore,
        reason: inverse.reason,
      },
    });

    // F-127 / D-103-write-path round 37 — stamp the undo actor before save.
    assignment.setUpdatedBy(row.actorId);
    await this.projectAssignmentRepository.save(assignment);
    await this.projectAssignmentRepository.appendHistory(history);

    this.auditLogger?.record({
      actionType: 'assignment.cancel.undone',
      actorId: row.actorId,
      category: 'assignment',
      changeSummary: `Cancellation of assignment ${row.entityId} reversed by undo token (restored to ${inverse.previousStatus}).`,
      details: {
        undoActionId: row.id,
        previousStatus: inverse.previousStatus,
        cancellationReason: inverse.reason,
      },
      metadata: {
        undoActionId: row.id,
        previousStatus: inverse.previousStatus,
      },
      targetEntityId: row.entityId,
      targetEntityType: 'ASSIGNMENT',
    });
  }

  private parseInverse(payload: unknown): AssignmentCancelInverse | null {
    if (!payload || typeof payload !== 'object') return null;
    const obj = payload as Record<string, unknown>;
    const previousStatus = obj.previousStatus;
    if (typeof previousStatus !== 'string') return null;
    const reason = obj.reason;
    return {
      previousStatus: previousStatus as AssignmentStatusValue,
      reason: typeof reason === 'string' ? reason : null,
    };
  }
}
