import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface ProjectTimeToFillPositionDto {
  positionId: string;
  role: string;
  fillStatus: string;
  firstOpenedAt: string | null;
  firstBookedAt: string | null;
  timeToFillDays: number | null;
}

export interface ProjectTimeToFillDto {
  projectId: string;
  positionCount: number;
  filledCount: number;
  medianDays: number | null;
  positions: ProjectTimeToFillPositionDto[];
}

/**
 * LEAN-P4b-1 — time-to-fill metric per project.
 *
 * For each ProjectPosition on the project, derive:
 *   firstOpenedAt = MIN(occurredAt WHERE changeType IN ('OPENED', 'DRAFTED'))
 *   firstBookedAt = MIN(occurredAt WHERE changeType IN ('BOOKED', 'ASSIGNED'))
 *   timeToFillDays = (firstBookedAt − firstOpenedAt) / 86_400_000   when both exist
 *
 * Aggregate = median(timeToFillDays) across all positions that are filled.
 */
@Injectable()
export class TimeToFillService {
  public constructor(private readonly prisma: PrismaService) {}

  public async execute(projectId: string): Promise<ProjectTimeToFillDto> {
    const positions = await this.prisma.projectPosition.findMany({
      where: { projectId },
      select: {
        id: true,
        role: true,
        fillStatus: true,
        fillHistory: {
          select: { changeType: true, occurredAt: true },
          orderBy: { occurredAt: 'asc' },
        },
      },
    });

    const positionDtos: ProjectTimeToFillPositionDto[] = positions.map((p) => {
      const firstOpened = p.fillHistory.find(
        (h) => h.changeType === 'OPENED' || h.changeType === 'DRAFTED',
      );
      const firstBooked = p.fillHistory.find(
        (h) => h.changeType === 'BOOKED' || h.changeType === 'ASSIGNED',
      );

      const firstOpenedAt = firstOpened?.occurredAt ?? null;
      const firstBookedAt = firstBooked?.occurredAt ?? null;

      let timeToFillDays: number | null = null;
      if (firstOpenedAt && firstBookedAt && firstBookedAt.getTime() >= firstOpenedAt.getTime()) {
        timeToFillDays = (firstBookedAt.getTime() - firstOpenedAt.getTime()) / 86_400_000;
      }

      return {
        positionId: p.id,
        role: p.role,
        fillStatus: p.fillStatus,
        firstOpenedAt: firstOpenedAt ? firstOpenedAt.toISOString() : null,
        firstBookedAt: firstBookedAt ? firstBookedAt.toISOString() : null,
        timeToFillDays,
      };
    });

    const durations = positionDtos
      .map((p) => p.timeToFillDays)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);

    const medianDays = computeMedian(durations);

    return {
      projectId,
      positionCount: positionDtos.length,
      filledCount: durations.length,
      medianDays,
      positions: positionDtos,
    };
  }
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[mid];
  return (values[mid - 1] + values[mid]) / 2;
}
