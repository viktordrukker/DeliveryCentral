import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import type {
  TeamConflict,
  TeamConflictPosition,
  TeamConflictsResponse,
} from './contracts/team-conflict.dto';

interface TeamConflictsCommand {
  /** DM portfolio scope: only positions on projects owned by this person. */
  deliveryManagerPersonId: string;
  /** Anchor instant — defaults to "now". Conflict window is the 4 weeks starting at this week's monday. */
  asOf?: Date;
}

interface PortfolioPositionRow {
  id: string;
  publicId: string | null;
  projectId: string;
  activePersonId: string | null;
  activeAllocationPercent: number | null;
  activeValidFrom: Date | null;
  activeValidTo: Date | null;
  fillStatus: string;
  project: { id: string; projectCode: string };
  activePerson: { id: string; displayName: string } | null;
}

const ACTIVE_FILL_STATUSES = ['BOOKED', 'ONBOARDING', 'ASSIGNED'] as const;
const WEEKS_IN_WINDOW = 4;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * LEAN-P4-missing-8 — surface every (Person × Week) bucket inside a 4-week
 * rolling window where the same person is allocated > 100 % across the
 * delivery manager's portfolio of `ProjectPosition` rows.
 *
 * Portfolio scope is derived from `Project.deliveryManagerId` — only
 * positions whose project's DM matches `deliveryManagerPersonId` count.
 */
@Injectable()
export class TeamConflictsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async execute(command: TeamConflictsCommand): Promise<TeamConflictsResponse> {
    if (!command.deliveryManagerPersonId) {
      throw new BadRequestException('deliveryManagerPersonId is required.');
    }

    const asOf = command.asOf ?? new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('asOf is not a valid date.');
    }

    const windowStart = mondayUtc(asOf);
    const windowEnd = new Date(windowStart.getTime() + WEEKS_IN_WINDOW * MS_PER_WEEK);

    const positions = (await this.prisma.projectPosition.findMany({
      where: {
        fillStatus: { in: [...ACTIVE_FILL_STATUSES] },
        activePersonId: { not: null },
        project: { deliveryManagerId: command.deliveryManagerPersonId },
        // Position's active interval must overlap the window.
        OR: [
          { activeValidFrom: null },
          { activeValidFrom: { lt: windowEnd } },
        ],
        AND: [
          {
            OR: [
              { activeValidTo: null },
              { activeValidTo: { gt: windowStart } },
            ],
          },
        ],
      },
      select: {
        id: true,
        publicId: true,
        projectId: true,
        activePersonId: true,
        activeAllocationPercent: true,
        activeValidFrom: true,
        activeValidTo: true,
        fillStatus: true,
        project: { select: { id: true, projectCode: true } },
        activePerson: { select: { id: true, displayName: true } },
      },
    })) as unknown as PortfolioPositionRow[];

    const conflicts: TeamConflict[] = [];

    for (let weekIdx = 0; weekIdx < WEEKS_IN_WINDOW; weekIdx += 1) {
      const weekStart = new Date(windowStart.getTime() + weekIdx * MS_PER_WEEK);
      const weekEnd = new Date(weekStart.getTime() + MS_PER_WEEK);

      const buckets = new Map<string, {
        personName: string;
        totalAllocationPct: number;
        positions: TeamConflictPosition[];
      }>();

      for (const row of positions) {
        if (!row.activePersonId) continue;
        if (!intervalOverlaps(row.activeValidFrom, row.activeValidTo, weekStart, weekEnd)) {
          continue;
        }
        const allocationPct = Number(row.activeAllocationPercent ?? 0);
        if (allocationPct <= 0) continue;

        const bucket = buckets.get(row.activePersonId) ?? {
          personName: row.activePerson?.displayName ?? row.activePersonId,
          totalAllocationPct: 0,
          positions: [],
        };
        bucket.totalAllocationPct += allocationPct;
        bucket.positions.push({
          positionId: row.id,
          positionPublicId: row.publicId ?? null,
          projectId: row.projectId,
          projectCode: row.project.projectCode,
          allocationPct,
        });
        buckets.set(row.activePersonId, bucket);
      }

      for (const [personId, bucket] of buckets) {
        if (bucket.totalAllocationPct <= 100) continue;
        conflicts.push({
          personId,
          personName: bucket.personName,
          weekStartIso: weekStart.toISOString(),
          totalAllocationPct: round2(bucket.totalAllocationPct),
          conflictPositions: bucket.positions
            .slice()
            .sort((a, b) => b.allocationPct - a.allocationPct),
        });
      }
    }

    conflicts.sort((a, b) => {
      const byWeek = a.weekStartIso.localeCompare(b.weekStartIso);
      if (byWeek !== 0) return byWeek;
      return b.totalAllocationPct - a.totalAllocationPct;
    });

    return { asOf: asOf.toISOString(), conflicts };
  }
}

/**
 * UTC-Monday-anchored week start. Keeps the math deterministic for tests
 * and matches the simpler bench/finance bucketing in the rest of the BE.
 */
function mondayUtc(instant: Date): Date {
  const utc = new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()),
  );
  const dow = utc.getUTCDay(); // 0..6, 0=Sun
  const offset = (dow + 6) % 7; // distance back to Monday
  utc.setUTCDate(utc.getUTCDate() - offset);
  return utc;
}

function intervalOverlaps(
  start: Date | null,
  end: Date | null,
  weekStart: Date,
  weekEnd: Date,
): boolean {
  const s = start ?? new Date(-8.64e15);
  const e = end ?? new Date(8.64e15);
  return s < weekEnd && e > weekStart;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
