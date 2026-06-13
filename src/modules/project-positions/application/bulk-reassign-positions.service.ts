import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import {
  ALLOCATION_CONSUMING_FILL_STATUSES,
  activeFillWindowWhere,
} from '@src/shared/persistence/active-fill-window';
import { decimalToNumber } from '@src/shared/persistence/decimal';
import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { InvalidPositionFillTransitionError } from '../domain/value-objects/position-fill-status';
import { ProjectPositionPrismaMapper } from '../infrastructure/repositories/prisma/project-position-prisma.mapper';
import { ProjectPositionReferenceRepositoryPort } from './ports/project-position-reference.repository.port';

export interface BulkReassignPositionsCommand {
  positionIds: string[];
  toPersonId?: string | null;
  toProjectId?: string;
  reason?: string;
  actorId: string;
  actorRoles: readonly PlatformRole[];
  /**
   * PR-14 (Decision D) — explicit Σ-allocation override. Only honoured for
   * RM/DM/admin actors; bulk moves cannot push the target person past 100%
   * without it.
   */
  allowOverallocation?: boolean;
}

const OVERALLOCATION_OVERRIDE_ROLES: readonly PlatformRole[] = [
  'resource_manager',
  'delivery_manager',
  'admin',
];

/** Fields the Σ-allocation guard reads off each pre-fetched position row. */
interface BulkReassignRow {
  activeAllocationPercent: unknown;
  requiredAllocationPercent: unknown;
  activeValidFrom: Date | null;
  activeValidTo: Date | null;
  startDate: Date;
  endDate: Date;
}

export interface BulkReassignPositionsResult {
  reassigned: number;
  positionIds: string[];
  errors: string[];
}

/**
 * LEAN-P4-missing-1 — bulk PM reassignment of project positions.
 *
 * For every selected position, update `activePersonId` (or clear it when
 * `toPersonId === null`) and/or `projectId` in a single
 * `prisma.$transaction`. PROPOSED positions are transitioned to BOOKED so
 * the bulk action also approves a slate of candidates. Already-BOOKED /
 * ONBOARDING / ASSIGNED positions have their active person swapped
 * in-place (no fill-status change). RELEASED rows are rejected — they are
 * terminal and the caller should know.
 *
 * PR-15 hardening:
 *   - DRAFT / OPEN rows are not filled — a person-reassign request against
 *     them fails per-row with NOT_FILLED instead of silently writing an
 *     activePersonId that bypassed the fill state machine.
 *   - The target person must exist (404) and be an active employee (409),
 *     via the same reference adapter as the create paths (issue 669).
 *   - Fill-history rows record the real change: in-place swaps and project
 *     moves write changeType REASSIGNED with the unchanged status on both
 *     sides — no fabricated ASSIGNED progression.
 *   - If every row failed (per-row validation and/or full transaction
 *     rollback), the request fails with 422 carrying the per-row errors.
 *     Mixed outcomes return 200 with the partial-failure envelope.
 *
 * Atomicity: rows that pass per-row validation are written in one
 * transaction — any write failure rolls all of them back so staffing state
 * never lands half-applied.
 */
@Injectable()
export class BulkReassignPositionsService {
  private readonly logger = new Logger(BulkReassignPositionsService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly referenceRepository: ProjectPositionReferenceRepositoryPort,
  ) {}

  public async execute(
    command: BulkReassignPositionsCommand,
  ): Promise<BulkReassignPositionsResult> {
    const ids = [...new Set(command.positionIds)];
    if (ids.length === 0) {
      throw new BadRequestException('positionIds must contain at least one id.');
    }
    if (command.toPersonId === undefined && command.toProjectId === undefined) {
      throw new BadRequestException(
        'At least one of toPersonId or toProjectId must be supplied.',
      );
    }

    // PR-15 — target validation. The new person applies to every row, so an
    // unknown (404) or non-active (409) target fails the whole request, same
    // conventions as the create-side reference checks (issue 669).
    if (typeof command.toPersonId === 'string') {
      const personExists = await this.referenceRepository.personExists(command.toPersonId);
      if (!personExists) {
        throw new NotFoundException('Target person does not exist.');
      }
      const personIsActive = await this.referenceRepository.personIsActive(command.toPersonId);
      if (!personIsActive) {
        throw new ConflictException('Target person is not an active employee.');
      }
    }

    // Pre-fetch every row outside the transaction so we can fail fast on
    // unknown ids and on terminal-state positions before any write.
    const rows = await this.prisma.projectPosition.findMany({
      where: { id: { in: ids } },
    });
    const found = new Map(rows.map((row) => [row.id, row]));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `ProjectPosition(s) not found: ${missing.join(', ')}`,
      );
    }
    const terminal = rows.filter((row) => row.fillStatus === 'RELEASED');
    if (terminal.length > 0) {
      throw new BadRequestException(
        `Cannot reassign RELEASED positions: ${terminal.map((r) => r.id).join(', ')}`,
      );
    }

    // PR-15 — per-row state-machine respect: DRAFT / OPEN rows have no
    // active person to reassign. They fail per-row instead of receiving a
    // silent in-place person write that never went through PROPOSED/BOOKED.
    const rowErrors: string[] = [];
    const eligibleIds: string[] = [];
    for (const id of ids) {
      const row = found.get(id)!;
      if (
        command.toPersonId !== undefined &&
        (row.fillStatus === 'DRAFT' || row.fillStatus === 'OPEN')
      ) {
        rowErrors.push(
          `${id}: NOT_FILLED — position is ${row.fillStatus} and has no active person; ` +
            'fill it via the propose/book flow before reassigning.',
        );
        continue;
      }
      eligibleIds.push(id);
    }

    if (eligibleIds.length === 0) {
      throw new UnprocessableEntityException({
        error: 'BulkReassignAllRowsFailed',
        message: rowErrors,
      });
    }

    // PR-14 (Decision D) — Σ-allocation guard. When a non-null person is
    // booked onto the eligible rows, their total allocation across overlapping
    // allocation-consuming positions plus every reassigned row must not exceed
    // 100%. The eligible rows are excluded from the existing-Σ query (they are
    // about to carry the new person, so they cannot count as prior load), then
    // each row's own allocation is added back. RM/DM/admin can override.
    let overrideNote: string | null = null;
    if (typeof command.toPersonId === 'string') {
      overrideNote = await this.enforceAllocationCap(
        command.toPersonId,
        eligibleIds,
        found,
        command,
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const id of eligibleIds) {
          const row = found.get(id)!;
          const position = ProjectPositionPrismaMapper.toDomain(row);
          const fromStatus = position.fillStatus.value;
          const fromProjectId = position.projectId;
          const fromPersonId = position.activePersonId;
          const originalVersion = position.version;

          // Reassign person: if PROPOSED and a non-null person is supplied,
          // transition to BOOKED with the new person (also bumps version).
          // Otherwise swap activePersonId in place.
          let didTransition = false;
          if (command.toPersonId !== undefined) {
            if (fromStatus === 'PROPOSED' && command.toPersonId !== null) {
              position.transitionFill('BOOKED', {
                actorRoles: command.actorRoles,
                personId: command.toPersonId,
                reason: command.reason,
              });
              didTransition = true;
            } else {
              position.setActivePersonId(command.toPersonId ?? undefined);
            }
          }

          if (command.toProjectId !== undefined) {
            position.setProjectId(command.toProjectId);
          }

          // Ensure exactly one version bump per position even when both
          // person + project change paths fire.
          if (!didTransition) {
            position.bumpVersion();
          }
          position.setUpdatedBy(command.actorId);

          const data = ProjectPositionPrismaMapper.toPersistence(position);
          const updated = await tx.projectPosition.updateMany({
            where: { id, version: originalVersion },
            data,
          });
          if (updated.count === 0) {
            throw new Error(
              `Optimistic concurrency conflict on ProjectPosition ${id} (expected version ${originalVersion}).`,
            );
          }

          // Audit: emit one ProjectPositionFillHistory row per position so
          // the bulk action is recoverable from the audit trail. A genuine
          // state-machine transition records its real edge (BOOKED); every
          // in-place person swap / project move records REASSIGNED with the
          // unchanged status on both sides. Project / person change details
          // are encoded in changeReason.
          const baseReason = command.reason
            ? `bulk_reassign:${command.reason}`
            : 'bulk_reassign';
          const reasonPrefix = overrideNote
            ? `${baseReason} — ${overrideNote}`
            : baseReason;
          const projectChange =
            fromProjectId !== position.projectId
              ? `;project:${fromProjectId}->${position.projectId}`
              : '';
          const personChange =
            fromPersonId !== position.activePersonId
              ? `;person:${fromPersonId ?? 'none'}->${
                  position.activePersonId ?? 'none'
                }`
              : '';
          await tx.projectPositionFillHistory.create({
            data: {
              positionId: id,
              changedByPersonId: command.actorId,
              changeType: didTransition ? 'BOOKED' : 'REASSIGNED',
              changeReason: `${reasonPrefix}${projectChange}${personChange}`,
              previousStatus: fromStatus,
              newStatus: position.fillStatus.value,
              previousPersonId: fromPersonId ?? null,
              newPersonId: position.activePersonId ?? null,
            },
          });
        }
      });
    } catch (err) {
      // The whole transaction rolled back — every eligible row failed on
      // top of any per-row validation errors. 422, never a 200 that claims
      // success after a rollback.
      this.logger.warn(
        `Bulk reassign rolled back: ${(err as Error).message}`,
      );
      throw new UnprocessableEntityException({
        error: 'BulkReassignAllRowsFailed',
        message: [
          ...rowErrors,
          `transaction rolled back — no positions were reassigned: ${(err as Error).message}`,
        ],
      });
    }

    return {
      reassigned: eligibleIds.length,
      positionIds: eligibleIds,
      errors: rowErrors,
    };
  }

  /**
   * Σ-allocation invariant for the bulk-move path. The target person's total
   * allocation across all overlapping allocation-consuming positions — minus
   * the rows being reassigned (they are about to carry this person and cannot
   * also count as prior load) plus each reassigned row's own allocation — must
   * not exceed 100%. Returns the audit note when an authorised override
   * (allowOverallocation + RM/DM/admin) was applied; null when within cap.
   */
  private async enforceAllocationCap(
    toPersonId: string,
    eligibleIds: string[],
    found: Map<string, BulkReassignRow>,
    command: BulkReassignPositionsCommand,
  ): Promise<string | null> {
    const eligibleSet = new Set(eligibleIds);
    // Union window spanning every reassigned row, against the canonical
    // active-fill-window predicate (issue 679): only allocation-consuming
    // fills whose active window overlaps the move are prior load.
    const windowStart = eligibleIds.reduce<Date>((min, id) => {
      const row = found.get(id)!;
      const start = row.activeValidFrom ?? row.startDate;
      return start < min ? start : min;
    }, found.get(eligibleIds[0])!.activeValidFrom ?? found.get(eligibleIds[0])!.startDate);
    const windowEnd = eligibleIds.reduce<Date>((max, id) => {
      const row = found.get(id)!;
      const end = row.activeValidTo ?? row.endDate;
      return end > max ? end : max;
    }, found.get(eligibleIds[0])!.activeValidTo ?? found.get(eligibleIds[0])!.endDate);

    // Existing Σ for the target person, excluding the rows we are about to
    // reassign onto them so they are not double-counted.
    const existingRows = await this.prisma.projectPosition.findMany({
      where: {
        ...activeFillWindowWhere({
          from: windowStart,
          to: windowEnd,
          statuses: ALLOCATION_CONSUMING_FILL_STATUSES,
        }),
        activePersonId: toPersonId,
      },
      select: { id: true, activeAllocationPercent: true, requiredAllocationPercent: true },
    });
    const existingTotal = existingRows
      .filter((row) => !eligibleSet.has(row.id))
      .reduce(
        (sum, row) =>
          sum + decimalToNumber(row.activeAllocationPercent ?? row.requiredAllocationPercent),
        0,
      );
    // Allocation the bulk move adds: each eligible row's own allocation.
    const addedTotal = eligibleIds.reduce((sum, id) => {
      const row = found.get(id)!;
      return sum + decimalToNumber(row.activeAllocationPercent ?? row.requiredAllocationPercent);
    }, 0);

    const projectedTotal = existingTotal + addedTotal;
    if (projectedTotal <= 100) {
      return null;
    }
    const overrideAllowed =
      command.allowOverallocation === true &&
      command.actorRoles.some((role) => OVERALLOCATION_OVERRIDE_ROLES.includes(role));
    if (!overrideAllowed) {
      throw new InvalidPositionFillTransitionError(
        `Over-allocation: person ${toPersonId} already has ${existingTotal}% active allocation in ` +
          `the overlapping window; this bulk reassign of ${addedTotal}% would take them to ` +
          `${projectedTotal}%. RM/DM/admin can retry with allowOverallocation to override.`,
        'OVERALLOCATION',
      );
    }
    return `over-allocation override by ${command.actorId}`;
  }
}
