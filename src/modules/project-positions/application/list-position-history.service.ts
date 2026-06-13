import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ProjectPositionFillChangeType,
  ProjectPositionFillStatus,
} from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * W2-04 — lean lifecycle history.
 *
 * Returns the full `ProjectPositionFillHistory` audit ledger for a single
 * position, ordered oldest-first. Lighter than `/forensics` (no dwell-time
 * computation, no current-status echo): suitable for embedding in the
 * position detail page beside the candidate slate.
 */
export interface ProjectPositionFillHistoryDto {
  id: string;
  positionId: string;
  changeType: ProjectPositionFillChangeType;
  previousStatus: ProjectPositionFillStatus | null;
  newStatus: ProjectPositionFillStatus | null;
  previousPersonId: string | null;
  newPersonId: string | null;
  changedByPersonId: string | null;
  changeReason: string | null;
  occurredAt: string;
}

export interface PositionHistoryResponseDto {
  positionId: string;
  history: ProjectPositionFillHistoryDto[];
}

@Injectable()
export class ListPositionHistoryService {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async execute(idOrPublicId: string): Promise<PositionHistoryResponseDto> {
    // W1-11 — accept both legacy uuid and `pos_…` publicId (mirrors
    // PositionForensicsService). The ParsePublicIdOrUuid pipe passes the value
    // verbatim; resolution happens here so a `pos_…` string isn't fed into the
    // uuid `id` column (which 500s on an invalid-uuid cast).
    const where = /^pos_[A-Za-z0-9]{10,}$/.test(idOrPublicId)
      ? { publicId: idOrPublicId }
      : { id: idOrPublicId };
    const position = await this.prisma.projectPosition.findUnique({
      where,
      select: {
        id: true,
        fillHistory: {
          select: {
            id: true,
            positionId: true,
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

    return {
      positionId: position.id,
      history: position.fillHistory.map((row) => ({
        id: row.id,
        positionId: row.positionId,
        changeType: row.changeType,
        previousStatus: row.previousStatus,
        newStatus: row.newStatus,
        previousPersonId: row.previousPersonId,
        newPersonId: row.newPersonId,
        changedByPersonId: row.changedByPersonId,
        changeReason: row.changeReason,
        occurredAt: row.occurredAt.toISOString(),
      })),
    };
  }
}
