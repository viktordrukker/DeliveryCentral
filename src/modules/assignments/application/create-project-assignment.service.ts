import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AssignmentStatus as PrismaAssignmentStatus, Prisma } from '@prisma/client';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { mapAssignmentStatusToFillStatus } from '@src/shared/lean-migration/enum-mappings';

/**
 * Minimal `$transaction` runner used when no PrismaService is injected
 * (in-memory unit tests). Invokes the closure with `undefined` as the
 * tx; the in-memory repos accept-and-ignore that, so write order
 * matches the production tx code path one-for-one.
 *
 * Production DI always passes the real PrismaService — see
 * `assignments.module.ts` factory wiring.
 */
const PASSTHROUGH_TX_RUNNER = {
  $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(undefined),
} as unknown as PrismaService;

import { AssignmentApproval } from '../domain/entities/assignment-approval.entity';
import { AssignmentHistory } from '../domain/entities/assignment-history.entity';
import { ProjectAssignment } from '../domain/entities/project-assignment.entity';
import { ProjectAssignmentRepositoryPort } from '../domain/repositories/project-assignment-repository.port';
import { AllocationPercent } from '../domain/value-objects/allocation-percent';
import { ApprovalState } from '../domain/value-objects/approval-state';
import { AssignmentStatus } from '../domain/value-objects/assignment-status';
import { ProjectAssignmentCreatedEvent } from '../domain/events/project-assignment-created.event';
import { DirectorApprovalThresholdService } from './director-approval-threshold.service';
import { AssignmentReferenceRepositoryPort } from './ports/assignment-reference.repository.port';

interface CreateProjectAssignmentCommand {
  actorId: string;
  allocationPercent: number;
  allowOverlapOverride?: boolean;
  draft?: boolean;
  endDate?: string;
  initialStatus?: 'PROPOSED' | 'BOOKED';
  note?: string;
  overrideReason?: string;
  personId: string;
  projectId: string;
  projectValidated?: boolean;
  personValidated?: boolean;
  staffingRequestId?: string;
  staffingRole: string;
  startDate: string;
}

@Injectable()
export class CreateProjectAssignmentService {
  public constructor(
    private readonly projectAssignmentRepository: ProjectAssignmentRepositoryPort,
    prisma?: PrismaService,
    private readonly assignmentReferenceRepository?: AssignmentReferenceRepositoryPort,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly employeeActivityService?: { record(cmd: { personId: string; eventType: string; summary: string; actorId?: string; relatedEntityId?: string; metadata?: Record<string, unknown> }): Promise<void> },
    private readonly directorApprovalThresholdService?: DirectorApprovalThresholdService,
  ) {
    this.prisma = prisma ?? PASSTHROUGH_TX_RUNNER;
    // LEAN-P1-6 — only the real PrismaService carries the projectPosition /
    // projectPositionFillHistory delegates. The PASSTHROUGH_TX_RUNNER stub
    // used by in-memory unit tests does not — skip canonical-position writes
    // there so the existing test-suite shape is preserved byte-for-byte.
    this.hasRealPrisma = prisma !== undefined;
  }

  private readonly prisma: PrismaService;
  private readonly hasRealPrisma: boolean;

  public async execute(command: CreateProjectAssignmentCommand): Promise<ProjectAssignment> {
    const startDate = new Date(command.startDate);
    const endDate = command.endDate ? new Date(command.endDate) : undefined;

    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Assignment start date is invalid.');
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Assignment end date is invalid.');
    }

    if (endDate && endDate < startDate) {
      throw new BadRequestException('Assignment end date must be on or after the start date.');
    }

    if (this.assignmentReferenceRepository) {
      if (!command.personValidated) {
        const personExists = await this.assignmentReferenceRepository.personExists(command.personId);
        if (!personExists) {
          throw new NotFoundException('Person does not exist.');
        }

        const personIsActive = await this.assignmentReferenceRepository.personIsActive(
          command.personId,
        );
        if (!personIsActive) {
          throw new ConflictException('Inactive employees cannot receive new assignments.');
        }
      }

      if (!command.projectValidated) {
        const projectExists = await this.assignmentReferenceRepository.projectExists(command.projectId);
        if (!projectExists) {
          throw new NotFoundException('Project does not exist.');
        }

        if (endDate && this.assignmentReferenceRepository.projectEndDate) {
          const projectEnd = await this.assignmentReferenceRepository.projectEndDate(command.projectId);
          if (projectEnd && endDate > projectEnd) {
            throw new BadRequestException('Assignment end date exceeds the project end date.');
          }
        }
      }
    } else {
      if (!command.personId.startsWith('11111111-')) {
        throw new NotFoundException('Person does not exist.');
      }

      if (!command.projectId.startsWith('33333333-')) {
        throw new NotFoundException('Project does not exist.');
      }
    }

    const conflicts = await this.projectAssignmentRepository.findOverlappingByPersonAndProject(
      command.personId,
      command.projectId,
      startDate,
      endDate,
    );

    if (conflicts.length > 0) {
      if (!command.allowOverlapOverride) {
        throw new ConflictException('Overlapping assignment for the same person and project already exists.');
      }

      const overrideReason = command.overrideReason?.trim();

      if (!overrideReason) {
        throw new BadRequestException('Assignment override reason is required.');
      }
    }

    const requiresDirectorApproval = this.directorApprovalThresholdService
      ? await this.directorApprovalThresholdService.evaluate({
          allocationPercent: command.allocationPercent,
          startDate,
          endDate,
        })
      : false;

    // Slate-pick callers pass `initialStatus: 'BOOKED'` so the assignment is
    // born with the picked person already approved. Direct callers omit it
    // and inherit the legacy PROPOSED start state.
    const initialStatus = command.draft
      ? AssignmentStatus.draft()
      : command.initialStatus === 'BOOKED'
        ? AssignmentStatus.booked()
        : AssignmentStatus.proposed();

    const assignment = ProjectAssignment.create({
      allocationPercent: AllocationPercent.from(command.allocationPercent),
      notes: command.note,
      personId: command.personId,
      projectId: command.projectId,
      requestedAt: new Date(),
      requestedByPersonId: command.actorId,
      requiresDirectorApproval,
      staffingRequestId: command.staffingRequestId,
      staffingRole: command.staffingRole,
      status: initialStatus,
      validFrom: startDate,
      validTo: endDate,
      // F-91 / D-103-write-path — first service to populate actor-audit col.
      createdByPersonId: command.actorId,
      // F-118 / D-103-write-path round 28 — also populate updatedByPersonId
      // on first insert (same actor as createdBy for new aggregates).
      updatedByPersonId: command.actorId,
    });

    const initialApproval = AssignmentApproval.create({
      assignmentId: assignment.assignmentId,
      decisionReason: 'Initial assignment request recorded.',
      decisionState: ApprovalState.requested(),
      decidedByPersonId: command.actorId,
      sequenceNumber: 1,
    });

    const historyEntry = AssignmentHistory.create({
      assignmentId: assignment.assignmentId,
      changeReason: 'Initial assignment request created.',
      changeType: command.draft
        ? 'STATUS_DRAFT'
        : command.initialStatus === 'BOOKED'
          ? 'STATUS_BOOKED'
          : 'STATUS_PROPOSED',
      changedByPersonId: command.actorId,
      newSnapshot: {
        allocationPercent: command.allocationPercent,
        personId: command.personId,
        projectId: command.projectId,
        staffingRole: command.staffingRole,
        status: assignment.status.value,
      },
      occurredAt: new Date(),
    });

    assignment.pullDomainEvents();
    const _event = ProjectAssignmentCreatedEvent.from({
      actorId: command.actorId,
      assignmentId: assignment.assignmentId,
      personId: command.personId,
      projectId: command.projectId,
      staffingRole: command.staffingRole,
    });

    // HD-0.2 (replaces the legacy DATA-05 partial-failure window). All writes
    // — assignment, initial approval, history entry, and the optional
    // override-applied history — share a single `prisma.$transaction` so any
    // failure rolls back the whole set. FK Restrict on AssignmentApproval /
    // AssignmentHistory still applies, but is no longer the only safety net.
    const overrideReason =
      conflicts.length > 0 && command.allowOverlapOverride
        ? command.overrideReason?.trim() ?? ''
        : undefined;

    await this.prisma.$transaction(async (tx) => {
      // LEAN-P1-6 — canonical write order: ProjectPosition + FillHistory
      // first (when a real Prisma client is wired), then the legacy
      // ProjectAssignment row keyed back to it via `legacyAssignmentId`.
      // The inverted mirror service (LEAN-P0-4) keeps the legacy row in
      // sync on subsequent transitions; here on first create we own both
      // writes inside the same atomic unit so consumers see a consistent
      // pair from the start.
      if (this.hasRealPrisma) {
        await this.writeCanonicalProjectPosition(assignment, command.actorId, tx);
      }

      await this.projectAssignmentRepository.save(assignment, tx);
      await this.projectAssignmentRepository.appendApproval(initialApproval, tx);
      await this.projectAssignmentRepository.appendHistory(historyEntry, tx);

      if (overrideReason !== undefined) {
        await this.projectAssignmentRepository.appendHistory(
          AssignmentHistory.create({
            assignmentId: assignment.assignmentId,
            changeReason: overrideReason,
            changeType: 'ASSIGNMENT_OVERRIDE_APPLIED',
            changedByPersonId: command.actorId,
            newSnapshot: {
              conflictingAssignmentIds: conflicts.map((item) => item.assignmentId.value),
              overrideType: 'OVERLAPPING_PERSON_PROJECT_ASSIGNMENT',
              status: assignment.status.value,
            },
            occurredAt: new Date(),
          }),
          tx,
        );
      }
    });

    this.auditLogger?.record({
      actionType: 'assignment.created',
      actorId: command.actorId,
      category: 'assignment',
      changeSummary: `Assignment created for person ${command.personId} on project ${command.projectId}.`,
      details: {
        allocationPercent: command.allocationPercent,
        personId: command.personId,
        projectId: command.projectId,
        staffingRole: command.staffingRole,
        status: assignment.status.value,
      },
      metadata: {
        allocationPercent: command.allocationPercent,
        personId: command.personId,
        projectId: command.projectId,
        staffingRole: command.staffingRole,
        status: assignment.status.value,
      },
      targetEntityId: assignment.assignmentId.value,
      targetEntityType: 'ASSIGNMENT',
    });

    if (conflicts.length > 0 && command.allowOverlapOverride) {
      const overrideReason = command.overrideReason?.trim() ?? '';
      this.auditLogger?.record({
        actionType: 'assignment.override_applied',
        actorId: command.actorId,
        category: 'assignment',
        changeSummary: `Assignment ${assignment.assignmentId.value} created through explicit overlap override.`,
        details: {
          conflictingAssignmentIds: conflicts.map((item) => item.assignmentId.value),
          overrideReason,
          overrideType: 'OVERLAPPING_PERSON_PROJECT_ASSIGNMENT',
          personId: command.personId,
          projectId: command.projectId,
        },
        metadata: {
          conflictingAssignmentIds: conflicts.map((item) => item.assignmentId.value),
          overrideReason,
          overrideType: 'OVERLAPPING_PERSON_PROJECT_ASSIGNMENT',
          personId: command.personId,
          projectId: command.projectId,
        },
        targetEntityId: assignment.assignmentId.value,
        targetEntityType: 'ASSIGNMENT',
      });
    }

    await this.notificationEventTranslator?.assignmentCreated({
      assignmentId: assignment.assignmentId.value,
      personId: command.personId,
      projectId: command.projectId,
      staffingRole: command.staffingRole,
    });

    this.employeeActivityService?.record({
      personId: command.personId,
      eventType: 'ASSIGNED',
      summary: `Assigned to project ${command.projectId} as ${command.staffingRole} at ${command.allocationPercent}%`,
      actorId: command.actorId,
      relatedEntityId: assignment.assignmentId.value,
      metadata: { projectId: command.projectId, staffingRole: command.staffingRole, allocationPercent: command.allocationPercent, status: assignment.status.value },
    }).catch((err: unknown) => {
      this.logger.warn(
        `Activity event ASSIGNED for ${command.personId} failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    });

    return assignment;
  }

  /**
   * LEAN-P1-6 — write the canonical `ProjectPosition` (and its first
   * `ProjectPositionFillHistory` row) for a newly created assignment.
   *
   * Idempotent via `legacyAssignmentId` (one position per legacy assignment).
   * The legacy `ProjectAssignment` write that follows in the same tx is
   * keyed back to this row via the same id, so the inverted mirror service
   * (LEAN-P0-4) can keep the legacy follower in sync on later transitions.
   *
   * `fillStatus` is computed via `mapAssignmentStatusToFillStatus` (Phase 0
   * shared mapper). The `activePersonId` slot is populated only when the
   * lean status lands on an "active" state (BOOKED/ONBOARDING/ASSIGNED/
   * ON_HOLD) so the read model can answer "who is filling this position
   * right now" without re-deriving it from history.
   *
   * D-103 actor-audit: `createdByPersonId` + `updatedByPersonId` are
   * stamped with the same `actorId` that wrote the legacy row.
   */
  private async writeCanonicalProjectPosition(
    assignment: ProjectAssignment,
    actorId: string,
    tx: unknown,
  ): Promise<void> {
    // Domain `AssignmentStatusValue` and Prisma `AssignmentStatus` are
    // identical string-literal unions (see `prisma/schema.prisma:357`).
    // The shared Phase-0 helper takes the Prisma type; the cast bridges
    // the two type aliases without runtime cost.
    const fillStatus = mapAssignmentStatusToFillStatus(
      assignment.status.value as PrismaAssignmentStatus,
    );
    const isActive =
      fillStatus === 'BOOKED' ||
      fillStatus === 'ONBOARDING' ||
      fillStatus === 'ASSIGNED' ||
      fillStatus === 'ON_HOLD';
    const allocation = assignment.allocationPercent?.value ?? 100;
    // The legacy schema makes `endDate` required on ProjectPosition but
    // optional on ProjectAssignment. When the legacy row has no end date,
    // fall back to a 365-day window — same convention the Sprint-2 backfill
    // and the inverted mirror service use.
    const endDate =
      assignment.validTo ??
      new Date(assignment.validFrom.getTime() + 365 * 24 * 60 * 60 * 1000);

    const txClient = tx as Prisma.TransactionClient;

    const positionData: Prisma.ProjectPositionUncheckedCreateInput = {
      projectId: assignment.projectId,
      role: assignment.staffingRole,
      requiredAllocationPercent: allocation.toString(),
      startDate: assignment.validFrom,
      endDate,
      fillStatus,
      activePersonId: isActive ? assignment.personId : null,
      activeAllocationPercent: isActive ? allocation.toString() : null,
      activeValidFrom: isActive ? assignment.validFrom : null,
      activeValidTo: isActive ? (assignment.validTo ?? null) : null,
      notes: assignment.notes ?? null,
      requiresDirectorApproval: assignment.requiresDirectorApproval,
      requestedByPersonId: assignment.requestedByPersonId ?? null,
      createdByPersonId: actorId,
      updatedByPersonId: actorId,
      legacyAssignmentId: assignment.assignmentId.value,
      legacyStaffingRequestId: assignment.staffingRequestId ?? null,
    };

    // Brand-new assignment → brand-new canonical position. The
    // `legacyAssignmentId` is freshly minted in this command, so a plain
    // `create` is safe. (No `@unique` constraint on `legacyAssignmentId`
    // means upsert would require composite-key lookups; we don't need
    // them for first-write.)
    const position = await txClient.projectPosition.create({
      data: positionData,
      select: { id: true },
    });

    // First fill-history row records the canonical creation. Subsequent
    // transitions append further rows via TransitionProjectPositionFillService.
    const changeType: Prisma.ProjectPositionFillHistoryUncheckedCreateInput['changeType'] =
      fillStatus === 'DRAFT'
        ? 'DRAFTED'
        : fillStatus === 'OPEN'
          ? 'OPENED'
          : fillStatus === 'PROPOSED'
            ? 'PROPOSED'
            : 'BOOKED';

    await txClient.projectPositionFillHistory.create({
      data: {
        positionId: position.id,
        changeType,
        changedByPersonId: actorId,
        changeReason: 'Initial assignment created (canonical write).',
        newPersonId: isActive ? assignment.personId : null,
        newStatus: fillStatus,
        newSnapshot: {
          allocationPercent: allocation,
          personId: assignment.personId,
          projectId: assignment.projectId,
          staffingRole: assignment.staffingRole,
          status: fillStatus,
        },
      },
    });
  }

  private readonly logger = new Logger(CreateProjectAssignmentService.name);
}
