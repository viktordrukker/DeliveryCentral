import { Injectable, Logger } from '@nestjs/common';
import type { AssignmentStatus, Prisma } from '@prisma/client';

import { DomainEventService } from '@src/modules/audit-observability/application/domain-event.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectPosition } from '../domain/entities/project-position.entity';
import { mapPositionFillStatusToLegacy } from '../domain/value-objects/position-fill-status';

/**
 * LEAN-P0-4 (V2 Master Plan Phase 0) — legacy follower / inverted mirror.
 *
 * Direction inverted from the Sprint-2 forward mirror. Originally this
 * service propagated legacy `ProjectAssignment` writes *forward* into the
 * new `ProjectPosition` aggregate so the lean model could be backfilled
 * incrementally. With Phase 1 of the lean migration about to re-point
 * canonical writes onto `ProjectPosition`, the legacy `ProjectAssignment`
 * row must instead follow `ProjectPosition`.
 *
 * Hook point: the lean canonical writer (e.g. `TransitionProjectPositionFillService`)
 * calls `mirrorBackToLegacy(position, actorId)` after persisting the
 * `ProjectPosition`. The service then looks up the paired legacy assignment
 * row via `position.legacyAssignmentId` (populated by the Sprint-2 backfill)
 * and patches its status / allocation / dates / reason fields so the ~34
 * legacy reader callsites (see `NEW-LGL-10`) keep observing consistent data
 * until the Phase 3 contract migration drops them entirely.
 *
 * Goes straight through Prisma rather than the legacy domain entity because:
 *  - This is a sync-from-authoritative-source, not a domain operation; the
 *    legacy entity's transition matrix would reject mirror writes that copy
 *    a lean state (e.g. RELEASED → CANCELLED with no preceding ON_HOLD).
 *  - Idempotency via `updateMany({ where: { id } })` is one SQL roundtrip.
 *
 * Skipped when `position.legacyAssignmentId` is null — only Sprint-2 backfilled
 * positions have a paired legacy row. Brand-new positions created post-Phase-1
 * live exclusively in `ProjectPosition` and have no legacy follower.
 *
 * Failure semantics: never blocks the canonical write. All errors caught + logged.
 * Same precedent as the original forward mirror.
 *
 * Retired when the Phase 3 contract migration drops `ProjectAssignment`.
 */
@Injectable()
export class ProjectPositionMirrorService {
  private readonly logger = new Logger(ProjectPositionMirrorService.name);

  public constructor(
    private readonly prisma: PrismaService,
    // Outbox emission via DomainEvent. Optional so legacy test fixtures keep
    // working. Emits a `project_position.legacy_follower.synced` event so
    // operators can confirm coupling at the staging deploy.
    private readonly domainEvents?: DomainEventService,
  ) {}

  /**
   * Propagate a canonical `ProjectPosition` write back into the paired legacy
   * `ProjectAssignment` row, if one exists (matched via `legacyAssignmentId`).
   *
   * Best-effort: failure here must never roll back the canonical write.
   */
  public async mirrorBackToLegacy(position: ProjectPosition, actorId: string): Promise<void> {
    try {
      const positionId = position.positionId.value;

      const row = await this.prisma.projectPosition.findUnique({
        where: { id: positionId },
        select: {
          id: true,
          legacyAssignmentId: true,
          activePersonId: true,
          activeAllocationPercent: true,
          activeValidFrom: true,
          activeValidTo: true,
          onboardingDate: true,
          notes: true,
        },
      });
      if (!row) {
        return;
      }
      const legacyAssignmentId = row.legacyAssignmentId;
      if (!legacyAssignmentId) {
        // Brand-new position with no legacy paired row — nothing to follow.
        return;
      }

      const legacyStatus = mapPositionFillStatusToLegacy(position.fillStatus.value) as AssignmentStatus;
      const allocationFromPosition =
        position.activeAllocationPercent ?? Number(row.activeAllocationPercent ?? 100);

      // Only the legacy `ProjectAssignment` columns that the inverted mirror
      // owns. Approval rows, history rows, and SLA fields stay on the legacy
      // model's own write paths until those callsites are migrated.
      const data: Prisma.ProjectAssignmentUncheckedUpdateManyInput = {
        status: legacyStatus,
        allocationPercent: allocationFromPosition.toString(),
        // `validFrom` is required on the legacy row, so skip the update when
        // the position has no active window (the column already has its
        // original backfill value).
        ...(row.activeValidFrom ? { validFrom: row.activeValidFrom } : {}),
        validTo: row.activeValidTo ?? null,
        onboardingDate: row.onboardingDate ?? null,
        notes: row.notes ?? null,
        onHoldReason: position.onHoldReason ?? null,
        onHoldCaseId: position.onHoldCaseId ?? null,
        cancellationReason: position.releaseReason ?? null,
        updatedByPersonId: actorId,
      };

      // `updateMany` over the unique id is idempotent + returns the affected
      // count so we can detect a missing legacy row without a separate read.
      const result = await this.prisma.projectAssignment.updateMany({
        where: { id: legacyAssignmentId },
        data,
      });

      if (result.count === 0) {
        // Position references a legacy row that's already gone — log so we
        // can spot stale `legacyAssignmentId` provenance, but don't fail.
        this.logger.warn(
          `Legacy follower target missing for position ${positionId} → legacy assignment ${legacyAssignmentId}`,
        );
        return;
      }

      if (this.domainEvents) {
        try {
          await this.domainEvents.recordAtomic({
            aggregateType: 'ProjectPosition',
            aggregateId: positionId,
            eventName: 'project_position.legacy_follower.synced',
            actorId,
            payload: {
              fillStatus: position.fillStatus.value,
              legacyStatus,
              legacyAssignmentId,
              source: 'legacy-follower-mirror',
            },
          });
        } catch (err) {
          this.logger.warn(
            `DomainEvent emit skipped/failed for position ${positionId} legacy-follower sync: ` +
              `${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `Legacy follower mirror failed for position ${position.positionId.value} → ${(err as Error).message}`,
      );
    }
  }
}
