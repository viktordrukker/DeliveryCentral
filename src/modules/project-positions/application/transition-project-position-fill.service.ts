import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { ProjectPosition } from '../domain/entities/project-position.entity';
import { ProjectPositionFillChangedEvent } from '../domain/events/project-position-fill-changed.event';
import { ProjectPositionRepositoryPort } from '../domain/repositories/project-position-repository.port';
import { PositionId } from '../domain/value-objects/position-id';
import type { PositionFillStatusValue } from '../domain/value-objects/position-fill-status';
import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

export interface TransitionProjectPositionFillCommand {
  positionId: string;
  toStatus: PositionFillStatusValue;
  actorId: string;
  actorRoles: readonly PlatformRole[];
  reason?: string;
  caseId?: string;
  personId?: string;
  allocationPercent?: number;
  validFrom?: string;
  validTo?: string;
}

/**
 * S2-3 — drive a `ProjectPosition` through its fill-status lifecycle.
 *
 * Delegates the state-machine validation + entity mutation to
 * `ProjectPosition.transitionFill()` (S2-2 entity helper). Persists the
 * resulting state via the repository port. Emits a
 * `ProjectPositionFillChangedEvent` for the S2-7 outbox + notification path.
 *
 * Mirrors the shape of the legacy `TransitionProjectAssignmentService` —
 * single entry point per transition request, optimistic-concurrency via
 * the entity's `version` bump.
 */
@Injectable()
export class TransitionProjectPositionFillService {
  private readonly logger = new Logger(TransitionProjectPositionFillService.name);

  public constructor(
    private readonly repository: ProjectPositionRepositoryPort,
    private readonly eventEmitter?: { emit(event: ProjectPositionFillChangedEvent): void | Promise<void> },
  ) {}

  public async execute(command: TransitionProjectPositionFillCommand): Promise<ProjectPosition> {
    const position = await this.repository.findByPositionId(PositionId.from(command.positionId));
    if (!position) {
      throw new NotFoundException(`ProjectPosition ${command.positionId} not found.`);
    }

    const fromStatus = position.fillStatus.value;

    position.transitionFill(command.toStatus, {
      actorRoles: command.actorRoles,
      reason: command.reason,
      caseId: command.caseId,
      personId: command.personId,
      allocationPercent: command.allocationPercent,
      validFrom: command.validFrom ? new Date(command.validFrom) : undefined,
      validTo: command.validTo ? new Date(command.validTo) : undefined,
    });
    position.setUpdatedBy(command.actorId);

    await this.repository.save(position);

    if (this.eventEmitter) {
      const event: ProjectPositionFillChangedEvent = {
        positionId: position.positionId.value,
        projectId: position.projectId,
        fromStatus,
        toStatus: command.toStatus,
        actorPersonId: command.actorId,
        activePersonId: position.activePersonId,
        reason: command.reason,
        occurredAt: new Date(),
      };
      try {
        await this.eventEmitter.emit(event);
      } catch (err) {
        // Non-blocking — event delivery failures should not roll back the transition.
        this.logger.warn(
          `Failed to emit ProjectPositionFillChangedEvent for ${event.positionId}: ${(err as Error).message}`,
        );
      }
    }

    return position;
  }
}
