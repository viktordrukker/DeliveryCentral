import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ProjectPositionFillChangeType } from '@prisma/client';

import { ProjectPosition } from '../domain/entities/project-position.entity';
import { ProjectPositionFillChangedEvent } from '../domain/events/project-position-fill-changed.event';
import { ProjectPositionRepositoryPort } from '../domain/repositories/project-position-repository.port';
import { PositionId } from '../domain/value-objects/position-id';
import {
  InvalidPositionFillTransitionError,
  type PositionFillStatusValue,
} from '../domain/value-objects/position-fill-status';
import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { sumOverlappingActiveAllocation } from '@src/shared/persistence/active-fill-window';
import { PrismaService } from '@src/shared/persistence/prisma.service';

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
  /**
   * PR-14 (Decision D) — explicit Σ-allocation override. Only honoured for
   * RM/DM/admin actors; the override is recorded on the fill-history row.
   */
  allowOverallocation?: boolean;
}

// Fill states that consume the person's allocation budget — the Σ-allocation
// guard fires on any transition INTO one of these.
const ALLOCATION_CONSUMING_STATUSES: ReadonlySet<PositionFillStatusValue> = new Set([
  'PROPOSED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
]);

const OVERALLOCATION_OVERRIDE_ROLES: readonly PlatformRole[] = [
  'resource_manager',
  'delivery_manager',
  'admin',
];

/** Maps the destination fill status onto the ledger's change-type vocabulary. */
const FILL_CHANGE_TYPE_BY_STATUS: Record<PositionFillStatusValue, ProjectPositionFillChangeType> = {
  DRAFT: 'DRAFTED',
  OPEN: 'OPENED',
  PROPOSED: 'PROPOSED',
  BOOKED: 'BOOKED',
  ONBOARDING: 'ONBOARDED',
  ASSIGNED: 'ASSIGNED',
  ON_HOLD: 'HELD',
  RELEASED: 'RELEASED',
};

/**
 * S2-3 — drive a `ProjectPosition` through its fill-status lifecycle.
 *
 * Delegates the state-machine validation + entity mutation to
 * `ProjectPosition.transitionFill()` (S2-2 entity helper). Persists the
 * resulting state via the repository port and writes one
 * `ProjectPositionFillHistory` ledger row per transition inside the same
 * transaction, so `/history`, `/forensics`, time-to-fill, and SLA readers
 * see every canonical transition. Emits a
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
    private readonly prisma: PrismaService,
    private readonly eventEmitter?: { emit(event: ProjectPositionFillChangedEvent): void | Promise<void> },
  ) {}

  public async execute(command: TransitionProjectPositionFillCommand): Promise<ProjectPosition> {
    // PR-14 (Decision D) — date sanity: a fill window cannot end before it starts.
    if (
      command.validFrom &&
      command.validTo &&
      new Date(command.validFrom) > new Date(command.validTo)
    ) {
      throw new InvalidPositionFillTransitionError(
        `validFrom (${command.validFrom}) must not be after validTo (${command.validTo}).`,
        'INVALID_DATES',
      );
    }

    const position = await this.repository.findByPositionId(PositionId.from(command.positionId));
    if (!position) {
      throw new NotFoundException(`ProjectPosition ${command.positionId} not found.`);
    }

    const fromStatus = position.fillStatus.value;
    const fromPersonId = position.activePersonId;

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

    // PR-14 (Decision D) — Σ-allocation guard. Runs after `transitionFill`
    // so the entity has already validated edge/role/reason/person and now
    // carries the post-transition fill window + allocation to check against.
    // Nothing is persisted on throw.
    let changeReason = command.reason ?? null;
    if (ALLOCATION_CONSUMING_STATUSES.has(command.toStatus) && position.activePersonId) {
      const overrideNote = await this.enforceAllocationCap(position, command);
      if (overrideNote) {
        changeReason = changeReason ? `${changeReason} — ${overrideNote}` : overrideNote;
      }
    }

    // Status update + ledger row commit (or roll back) together so the
    // fill-history audit trail can never drift from the position's state.
    await this.prisma.$transaction(async (tx) => {
      await this.repository.save(position, tx);
      await tx.projectPositionFillHistory.create({
        data: {
          positionId: position.positionId.value,
          changeType: FILL_CHANGE_TYPE_BY_STATUS[command.toStatus],
          changedByPersonId: command.actorId,
          changeReason,
          previousStatus: fromStatus,
          newStatus: command.toStatus,
          previousPersonId: fromPersonId ?? null,
          newPersonId: position.activePersonId ?? null,
        },
      });
    });

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

  /**
   * Σ-allocation invariant: a person's total allocation across all
   * allocation-consuming positions with overlapping active windows must not
   * exceed 100%. Returns the audit note when an authorised override
   * (allowOverallocation + RM/DM/admin) was applied; null when within cap.
   */
  private async enforceAllocationCap(
    position: ProjectPosition,
    command: TransitionProjectPositionFillCommand,
  ): Promise<string | null> {
    const personId = position.activePersonId as string;
    const thisAllocation = position.activeAllocationPercent ?? position.requiredAllocationPercent;
    const currentTotal = await sumOverlappingActiveAllocation(this.prisma, {
      personId,
      from: position.activeValidFrom ?? position.startDate,
      to: position.activeValidTo ?? position.endDate,
      excludePositionId: position.positionId.value,
    });
    if (currentTotal + thisAllocation <= 100) {
      return null;
    }
    const overrideAllowed =
      command.allowOverallocation === true &&
      command.actorRoles.some((role) => OVERALLOCATION_OVERRIDE_ROLES.includes(role));
    if (!overrideAllowed) {
      throw new InvalidPositionFillTransitionError(
        `Over-allocation: person ${personId} already has ${currentTotal}% active allocation in the ` +
          `overlapping window; this ${thisAllocation}% fill would take them to ` +
          `${currentTotal + thisAllocation}%. RM/DM/admin can retry with allowOverallocation to override.`,
        'OVERALLOCATION',
      );
    }
    return `over-allocation override by ${command.actorId}`;
  }
}
