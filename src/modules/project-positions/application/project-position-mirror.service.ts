import { Injectable, Logger } from '@nestjs/common';

import type { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { DomainEventService } from '@src/modules/audit-observability/application/domain-event.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { mapLegacyAssignmentStatus } from '../domain/value-objects/position-fill-status';

/**
 * Sprint 2 / S2-6 — dual-write mirror.
 *
 * Legacy `ProjectAssignment` writes (create + transition) call this service
 * AFTER their primary save. The mirror finds-or-creates a `ProjectPosition`
 * row with `legacyAssignmentId` provenance (matching the S2-5 backfill
 * shape) and updates its activeFill + fillStatus to reflect the latest
 * assignment state.
 *
 * Goes straight through Prisma rather than the domain entity because:
 *  - The mirror is a sync-from-authoritative-source, not a domain operation;
 *    we don't want the entity's transition matrix to reject mirror writes
 *    that copy a legacy state.
 *  - The new entity's `props` shape doesn't carry the legacy provenance
 *    columns by design — Prisma is the right boundary.
 *  - Idempotency via `upsert(where legacyAssignmentId)` is one SQL roundtrip;
 *    via the entity layer it would be findById + (if missing then create)
 *    + save = 2-3 roundtrips.
 *
 * Failure semantics: never blocks the legacy write. All errors caught + logged.
 * Same precedent as `TransitionProjectAssignmentService.syncParentSrHeadcount`.
 *
 * Retired in Sprint 5 contract phase when legacy `ProjectAssignment` is dropped.
 */
@Injectable()
export class ProjectPositionMirrorService {
  private readonly logger = new Logger(ProjectPositionMirrorService.name);

  public constructor(
    private readonly prisma: PrismaService,
    // Sprint 2 / S2-7b — outbox emission via DomainEvent. Optional so legacy
    // test fixtures keep working. Runtime no-ops until the paired PR-A
    // (`AggregateType.ProjectPosition` enum extension) lands.
    private readonly domainEvents?: DomainEventService,
  ) {}

  public async mirrorAssignment(assignment: ProjectAssignment, actorId: string): Promise<void> {
    try {
      const assignmentId = assignment.assignmentId.value;
      const fillStatus = mapLegacyAssignmentStatus(assignment.status.value);
      const isActive = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(
        assignment.status.value,
      );
      const alloc = assignment.allocationPercent?.value ?? 100;

      const activeFields = isActive
        ? {
            activePersonId: assignment.personId,
            activeAllocationPercent: alloc.toString(),
            activeValidFrom: assignment.validFrom,
            activeValidTo: assignment.validTo ?? null,
          }
        : {
            activePersonId: null,
            activeAllocationPercent: null,
            activeValidFrom: null,
            activeValidTo: null,
          };

      const existing = await this.prisma.projectPosition.findFirst({
        where: { legacyAssignmentId: assignmentId },
        select: { id: true, version: true },
      });

      let positionId: string;
      if (existing) {
        positionId = existing.id;
        await this.prisma.projectPosition.update({
          where: { id: existing.id },
          data: {
            fillStatus,
            ...activeFields,
            onboardingDate: assignment.onboardingDate ?? null,
            notes: assignment.notes ?? null,
            rejectionReason: assignment.rejectionReason ?? null,
            cancellationReason: assignment.cancellationReason ?? null,
            onHoldReason: assignment.onHoldReason ?? null,
            onHoldCaseId: assignment.onHoldCaseId ?? null,
            updatedByPersonId: actorId,
            version: existing.version + 1,
          },
        });
      } else {
        const fallbackEnd = assignment.validTo
          ?? new Date(assignment.validFrom.getTime() + 365 * 24 * 60 * 60 * 1000);
        const created = await this.prisma.projectPosition.create({
          data: {
            projectId: assignment.projectId,
            role: assignment.staffingRole,
            requiredAllocationPercent: alloc.toString(),
            startDate: assignment.validFrom,
            endDate: fallbackEnd,
            fillStatus,
            ...activeFields,
            onboardingDate: assignment.onboardingDate ?? null,
            notes: assignment.notes ?? null,
            requestedByPersonId: assignment.requestedByPersonId ?? null,
            createdByPersonId: actorId,
            updatedByPersonId: actorId,
            legacyAssignmentId: assignmentId,
            legacyStaffingRequestId: assignment.staffingRequestId ?? null,
          },
          select: { id: true },
        });
        positionId = created.id;
      }

      // Sprint 2 / S2-7b — emit a DomainEvent into the transactional outbox.
      // Best-effort: failure here doesn't roll back the mirror write above.
      // No-ops at runtime until the paired PR-A `AggregateType.ProjectPosition`
      // enum value lands — Postgres will reject the INSERT with "invalid input
      // value for enum AggregateType: 'ProjectPosition'" and the try/catch
      // swallows it. Once the enum value exists, emissions start automatically.
      if (this.domainEvents) {
        try {
          await this.domainEvents.recordAtomic({
            aggregateType: 'ProjectPosition',
            aggregateId: positionId,
            eventName: 'project_position.fill.changed',
            actorId,
            payload: {
              fillStatus,
              activePersonId: activeFields.activePersonId ?? null,
              activeAllocationPercent: activeFields.activeAllocationPercent ?? null,
              legacyAssignmentId: assignmentId,
              source: 'dual-write-mirror',
            },
          });
        } catch (err) {
          // Expected pre-PR-A; harmless. Logged at debug-equivalent level
          // (warn) so an operator can confirm coupling at first staging deploy.
          this.logger.warn(
            `DomainEvent emit skipped/failed for position ${positionId} ` +
              `(expected until PR-A AggregateType extension lands): ` +
              `${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `Mirror failed for assignment ${assignment.assignmentId.value} → ${(err as Error).message}`,
      );
    }
  }
}
