import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { DirectorSlaSummaryDto } from './contracts/director-sla-summary.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MIN_SAMPLE = 3;

// F-63 / 20c-11 — 3rd `PrismaShape` hand-rolled gateway interface deleted.
// Same pattern as F-55 (pending-actions-query) + F-57 (nudge-staffing-request).
// Prisma exposes typed `projectAssignment` + `staffingRequestFulfilment`
// delegates directly.

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

@Injectable()
export class DirectorSlaSummaryQueryService {
  public constructor(private readonly prisma: PrismaService) {}

  public async execute(): Promise<DirectorSlaSummaryDto> {
    const now = Date.now();

    const slaWindowStart = new Date(now - DAY_MS);
    const slaWindowEnd = new Date(now + DAY_MS);
    const ttfWindowStart = new Date(now - 4 * WEEK_MS);

    const [slaBreaches24h, fulfilments] = await Promise.all([
      this.prisma.projectAssignment.count({
        where: {
          slaDueAt: { gte: slaWindowStart, lte: slaWindowEnd },
          slaBreachedAt: null,
        },
      }),
      this.prisma.staffingRequestFulfilment.findMany({
        where: { fulfilledAt: { gte: ttfWindowStart } },
        select: {
          fulfilledAt: true,
          request: { select: { createdAt: true } },
        },
      }),
    ]);

    const ttfDaysAll = fulfilments.map(
      (f) => (f.fulfilledAt.getTime() - f.request.createdAt.getTime()) / DAY_MS,
    );

    // Bucket by week-of-fulfilment (4 buckets, oldest first).
    const buckets: number[][] = [[], [], [], []];
    for (const f of fulfilments) {
      const weekIndex = Math.min(
        3,
        Math.max(0, Math.floor((f.fulfilledAt.getTime() - ttfWindowStart.getTime()) / WEEK_MS)),
      );
      const days = (f.fulfilledAt.getTime() - f.request.createdAt.getTime()) / DAY_MS;
      buckets[weekIndex].push(days);
    }
    const timeToFillSeries = buckets.map((b) => median(b) ?? 0);
    const overallMedian = ttfDaysAll.length >= MIN_SAMPLE ? median(ttfDaysAll) : null;

    return {
      slaBreaches24h,
      timeToFillSeries,
      timeToFillMedianDays: overallMedian,
      timeToFillSampleSize: ttfDaysAll.length,
    };
  }
}
