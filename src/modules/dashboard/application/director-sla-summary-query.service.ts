import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { DirectorSlaSummaryDto } from './contracts/director-sla-summary.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MIN_SAMPLE = 3;

// SoT PR 14b — re-point both legacy reads onto the canonical staffing
// aggregate. SLA-breach count now reads ProjectPosition.slaDueAt /
// slaBreachedAt (the lean equivalent of the legacy ProjectAssignment SLA
// columns). Time-to-fill (TTF) now derives from ProjectPositionFillHistory
// rows with `changeType === 'BOOKED'`: the position's `createdAt` is the
// demand-creation timestamp (lean equivalent of legacy StaffingRequest.
// createdAt) and the fill-history `occurredAt` is the fulfilment timestamp
// (lean equivalent of legacy StaffingRequestFulfilment.fulfilledAt).

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
      this.prisma.projectPosition.count({
        where: {
          slaDueAt: { gte: slaWindowStart, lte: slaWindowEnd },
          slaBreachedAt: null,
        },
      }),
      this.prisma.projectPositionFillHistory.findMany({
        where: {
          changeType: 'BOOKED',
          occurredAt: { gte: ttfWindowStart },
        },
        select: {
          occurredAt: true,
          position: { select: { createdAt: true } },
        },
      }),
    ]);

    const ttfDaysAll = fulfilments.map(
      (f) => (f.occurredAt.getTime() - f.position.createdAt.getTime()) / DAY_MS,
    );

    // Bucket by week-of-fulfilment (4 buckets, oldest first).
    const buckets: number[][] = [[], [], [], []];
    for (const f of fulfilments) {
      const weekIndex = Math.min(
        3,
        Math.max(0, Math.floor((f.occurredAt.getTime() - ttfWindowStart.getTime()) / WEEK_MS)),
      );
      const days = (f.occurredAt.getTime() - f.position.createdAt.getTime()) / DAY_MS;
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
