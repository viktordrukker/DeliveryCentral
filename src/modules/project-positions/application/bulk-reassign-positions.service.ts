import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { ProjectPositionPrismaMapper } from '../infrastructure/repositories/prisma/project-position-prisma.mapper';

export interface BulkReassignPositionsCommand {
  positionIds: string[];
  toPersonId?: string | null;
  toProjectId?: string;
  reason?: string;
  actorId: string;
  actorRoles: readonly PlatformRole[];
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
 * Atomicity: any single position failure rolls the whole batch back so
 * staffing state never lands half-applied.
 */
@Injectable()
export class BulkReassignPositionsService {
  private readonly logger = new Logger(BulkReassignPositionsService.name);

  public constructor(private readonly prisma: PrismaService) {}

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

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const id of ids) {
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
          // the bulk action is recoverable from the audit trail. We re-use
          // the existing enum members (BOOKED when the position transitioned,
          // ASSIGNED for in-place active-person swaps) and encode project /
          // person change details in changeReason so no schema migration is
          // required.
          const reasonPrefix = command.reason
            ? `bulk_reassign:${command.reason}`
            : 'bulk_reassign';
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
              changeType: didTransition ? 'BOOKED' : 'ASSIGNED',
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
      this.logger.warn(
        `Bulk reassign rolled back: ${(err as Error).message}`,
      );
      return {
        reassigned: 0,
        positionIds: [],
        errors: [(err as Error).message],
      };
    }

    return { reassigned: ids.length, positionIds: ids, errors: [] };
  }
}
