import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { sumOverlappingActiveAllocation } from '@src/shared/persistence/active-fill-window';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectPosition } from '../domain/entities/project-position.entity';
import { ProjectPositionFillChangedEvent } from '../domain/events/project-position-fill-changed.event';
import { ProjectPositionRepositoryPort } from '../domain/repositories/project-position-repository.port';
import { InvalidPositionFillTransitionError } from '../domain/value-objects/position-fill-status';
import { CreateProjectPositionService } from './create-project-position.service';
import { ProjectPositionReferenceRepositoryPort } from './ports/project-position-reference.repository.port';

export interface CreateAndBookProjectPositionCommand {
  actorId: string;
  actorRoles: readonly PlatformRole[];
  projectId: string;
  personId: string;
  role: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
  note?: string;
  /**
   * PR-14 (Decision D) — explicit Σ-allocation override. Only honoured for
   * RM/DM/admin actors; the override is recorded on the fill-history rows.
   */
  allowOverallocation?: boolean;
}

const OVERALLOCATION_OVERRIDE_ROLES: readonly PlatformRole[] = [
  'resource_manager',
  'delivery_manager',
  'admin',
];

/**
 * Internal authority for the composite transitions. The endpoint-level
 * `@RequireRoles` gate is the RBAC boundary for this action; the individual
 * OPEN→PROPOSED (RM/DM) and PROPOSED→BOOKED (PM/DM/director) edges are
 * driven with break-glass authority so a PM or RM can perform the whole
 * direct-booking in one call. Same precedent as `AssignProjectTeamService`.
 */
const BOOKING_AUTHORITY: readonly PlatformRole[] = ['admin'];

/**
 * Atomic create-and-book — POST /project-positions/create-and-book.
 *
 * Direct-booking surfaces (CreateAssignmentModal, batch confirm, planner
 * draft, RM quick assign) previously did create(OPEN) → transition(BOOKED),
 * an edge that does not exist in the fill state machine — the transition
 * failed and left an orphaned OPEN position behind.
 *
 * This service drives the canonical OPEN → PROPOSED(person) → BOOKED path
 * through the existing `ProjectPosition.transitionFill` state machine and
 * persists everything — the position row plus BOTH fill-history ledger rows
 * (PR 659 pattern) — inside one `prisma.$transaction`. Any failure rolls the
 * whole unit back: no orphan positions, no partial ledgers.
 */
@Injectable()
export class CreateAndBookProjectPositionService {
  private readonly logger = new Logger(CreateAndBookProjectPositionService.name);

  public constructor(
    private readonly repository: ProjectPositionRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly createService: CreateProjectPositionService,
    private readonly referenceRepository: ProjectPositionReferenceRepositoryPort,
    private readonly eventEmitter?: { emit(event: ProjectPositionFillChangedEvent): void | Promise<void> },
  ) {}

  public async execute(command: CreateAndBookProjectPositionCommand): Promise<ProjectPosition> {
    // Only the booked person is validated here — project existence + active
    // status are guarded by `CreateProjectPositionService` (same adapter)
    // inside the transaction; a rejected project rolls the unit back with
    // nothing written.
    const personExists = await this.referenceRepository.personExists(command.personId);
    if (!personExists) {
      throw new NotFoundException('Person does not exist.');
    }
    const personIsActive = await this.referenceRepository.personIsActive(command.personId);
    if (!personIsActive) {
      throw new ConflictException(
        'Person is not an active employee — cannot book them onto a position.',
      );
    }

    const validFrom = new Date(command.startDate);
    const validTo = new Date(command.endDate);

    // PR-14 (Decision D) — Σ-allocation guard. The booked person's total
    // allocation across overlapping allocation-consuming positions plus this
    // booking must not exceed 100%, unless an RM/DM/admin explicitly
    // overrides — in which case the override is recorded on both ledger rows.
    // The guard only runs on a sane window: invalid/inverted dates skip it so
    // the create service's date validation (400) inside the transaction wins
    // over a spurious 409.
    const windowIsSane =
      !Number.isNaN(validFrom.getTime()) &&
      !Number.isNaN(validTo.getTime()) &&
      validFrom <= validTo;
    let note = command.note;
    if (windowIsSane) {
      const currentTotal = await sumOverlappingActiveAllocation(this.prisma, {
        personId: command.personId,
        from: validFrom,
        to: validTo,
      });
      if (currentTotal + command.allocationPercent > 100) {
        const overrideAllowed =
          command.allowOverallocation === true &&
          command.actorRoles.some((role) => OVERALLOCATION_OVERRIDE_ROLES.includes(role));
        if (!overrideAllowed) {
          throw new InvalidPositionFillTransitionError(
            `Over-allocation: person ${command.personId} already has ${currentTotal}% active ` +
              `allocation in the overlapping window; this ${command.allocationPercent}% booking ` +
              `would take them to ${currentTotal + command.allocationPercent}%. RM/DM/admin can ` +
              `retry with allowOverallocation to override.`,
            'OVERALLOCATION',
          );
        }
        const overrideNote = `over-allocation override by ${command.actorId}`;
        note = note ? `${note} — ${overrideNote}` : overrideNote;
      }
    }

    const position = await this.prisma.$transaction(async (tx) => {
      const created = await this.createService.execute(
        {
          actorId: command.actorId,
          projectId: command.projectId,
          role: command.role,
          requiredAllocationPercent: command.allocationPercent,
          startDate: command.startDate,
          endDate: command.endDate,
          openImmediately: true,
          // requestedByPersonId intentionally omitted — the create service
          // defaults it to actorId, and an explicit pass would subject the
          // actor (possibly a userId principal) to Person reference checks.
        },
        tx,
      );

      // OPEN → PROPOSED — the person-required invariant (PR 664) attaches
      // the candidate here; person-less booking is rejected by the entity.
      created.transitionFill('PROPOSED', {
        actorRoles: BOOKING_AUTHORITY,
        personId: command.personId,
        allocationPercent: command.allocationPercent,
        validFrom,
        validTo,
      });
      created.setUpdatedBy(command.actorId);
      await this.repository.save(created, tx);
      await tx.projectPositionFillHistory.create({
        data: {
          positionId: created.positionId.value,
          changeType: 'PROPOSED',
          changedByPersonId: command.actorId,
          changeReason: note ?? null,
          previousStatus: 'OPEN',
          newStatus: 'PROPOSED',
          previousPersonId: null,
          newPersonId: command.personId,
        },
      });

      // PROPOSED → BOOKED — active person already set by the previous edge.
      created.transitionFill('BOOKED', {
        actorRoles: BOOKING_AUTHORITY,
      });
      await this.repository.save(created, tx);
      await tx.projectPositionFillHistory.create({
        data: {
          positionId: created.positionId.value,
          changeType: 'BOOKED',
          changedByPersonId: command.actorId,
          changeReason: note ?? null,
          previousStatus: 'PROPOSED',
          newStatus: 'BOOKED',
          previousPersonId: command.personId,
          newPersonId: command.personId,
        },
      });

      return created;
    });

    if (this.eventEmitter) {
      const event: ProjectPositionFillChangedEvent = {
        positionId: position.positionId.value,
        projectId: position.projectId,
        fromStatus: 'OPEN',
        toStatus: 'BOOKED',
        actorPersonId: command.actorId,
        activePersonId: position.activePersonId,
        reason: note,
        occurredAt: new Date(),
      };
      try {
        await this.eventEmitter.emit(event);
      } catch (err) {
        // Non-blocking — event delivery failures should not fail the booking.
        this.logger.warn(
          `Failed to emit ProjectPositionFillChangedEvent for ${event.positionId}: ${(err as Error).message}`,
        );
      }
    }

    return position;
  }
}
