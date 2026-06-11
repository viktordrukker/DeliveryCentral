import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectPosition } from '../domain/entities/project-position.entity';
import { ProjectPositionFillChangedEvent } from '../domain/events/project-position-fill-changed.event';
import { ProjectPositionRepositoryPort } from '../domain/repositories/project-position-repository.port';
import { CreateProjectPositionService } from './create-project-position.service';

export interface CreateAndBookProjectPositionCommand {
  actorId: string;
  projectId: string;
  personId: string;
  role: string;
  allocationPercent: number;
  startDate: string;
  endDate: string;
  note?: string;
}

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
    private readonly eventEmitter?: { emit(event: ProjectPositionFillChangedEvent): void | Promise<void> },
  ) {}

  public async execute(command: CreateAndBookProjectPositionCommand): Promise<ProjectPosition> {
    const project = await this.prisma.project.findUnique({
      where: { id: command.projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project does not exist.');
    }

    const person = await this.prisma.person.findUnique({
      where: { id: command.personId },
      select: { id: true },
    });
    if (!person) {
      throw new NotFoundException('Person does not exist.');
    }

    const validFrom = new Date(command.startDate);
    const validTo = new Date(command.endDate);

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
          requestedByPersonId: command.actorId,
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
          changeReason: command.note ?? null,
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
          changeReason: command.note ?? null,
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
        reason: command.note,
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
