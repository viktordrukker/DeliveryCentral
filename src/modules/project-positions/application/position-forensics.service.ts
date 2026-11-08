import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ProjectPositionFillChangeType,
  ProjectPositionFillStatus,
} from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface PositionForensicsEventDto {
  id: string;
  changeType: ProjectPositionFillChangeType;
  previousStatus: ProjectPositionFillStatus | null;
  newStatus: ProjectPositionFillStatus | null;
  previousPersonId: string | null;
  newPersonId: string | null;
  changedByPersonId: string | null;
  changeReason: string | null;
  occurredAt: string;
  // Dwell-time IN this event's `newStatus`. Computed as the gap to the next
  // event, or — for the most recent event — the gap from `occurredAt` to
  // `asOf`. `null` when the row has no `newStatus` (i.e. nothing to dwell in).
  dwellMs: number | null;
  // Whether `dwellMs` exceeds the threshold for `newStatus`. Long dwells
  // surface in red on the timeline. Thresholds:
  //   OPEN     > 7d
  //   PROPOSED > 3d
  // Other states do not raise a flag.
  longDwell: boolean;
}

export interface PositionForensicsDto {
  positionId: string;
  projectId: string;
  role: string;
  currentStatus: ProjectPositionFillStatus;
  events: PositionForensicsEventDto[];
  asOf: string;
}

const LONG_DWELL_THRESHOLDS_MS: Partial<Record<ProjectPositionFillStatus, number>> = {
  OPEN: 7 * 86_400_000,
  PROPOSED: 3 * 86_400_000,
};

/**
 * LEAN-P4b-2 — position-state forensics.
 *
 * Given a `ProjectPosition`, returns its full `ProjectPositionFillHistory`
 * timeline annotated with per-event dwell-time and a `longDwell` flag for
 * threshold-overruns (OPEN > 7d, PROPOSED > 3d). PM uses this to answer
 * "why did this position take N days?".
 */
@Injectable()
export class PositionForensicsService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async execute(idOrPublicId: string, now: Date = new Date()): Promise<PositionForensicsDto> {
    // W1-11 — accept both legacy uuid and `pos_…` publicId.
    const where = /^pos_[A-Za-z0-9]{10,}$/.test(idOrPublicId)
      ? { publicId: idOrPublicId }
      : { id: idOrPublicId };
    const position = await this.prisma.projectPosition.findUnique({
      where,
      select: {
        id: true,
        projectId: true,
        role: true,
        fillStatus: true,
        fillHistory: {
          select: {
            id: true,
            changeType: true,
            previousStatus: true,
            newStatus: true,
            previousPersonId: true,
            newPersonId: true,
            changedByPersonId: true,
            changeReason: true,
            occurredAt: true,
          },
          orderBy: { occurredAt: 'asc' },
        },
      },
    });

    if (!position) {
      throw new NotFoundException(`ProjectPosition ${idOrPublicId} not found.`);
    }

    const events: PositionForensicsEventDto[] = position.fillHistory.map((event, index) => {
      const next = position.fillHistory[index + 1];
      const newStatus = event.newStatus;
      const endMs = next ? next.occurredAt.getTime() : now.getTime();
      const startMs = event.occurredAt.getTime();
      // Negative or zero dwell — clamp to 0; null when there's no resting status.
      const dwellMs: number | null = newStatus ? Math.max(0, endMs - startMs) : null;
      const threshold = newStatus ? LONG_DWELL_THRESHOLDS_MS[newStatus] : undefined;
      const longDwell = dwellMs !== null && threshold !== undefined && dwellMs > threshold;
      return {
        id: event.id,
        changeType: event.changeType,
        previousStatus: event.previousStatus ?? null,
        newStatus,
        previousPersonId: event.previousPersonId ?? null,
        newPersonId: event.newPersonId ?? null,
        changedByPersonId: event.changedByPersonId ?? null,
        changeReason: event.changeReason ?? null,
        occurredAt: event.occurredAt.toISOString(),
        dwellMs,
        longDwell,
      };
    });

    return {
      positionId: position.id,
      projectId: position.projectId,
      role: position.role,
      currentStatus: position.fillStatus,
      events,
      asOf: now.toISOString(),
    };
  }
}
