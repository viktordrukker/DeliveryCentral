import { BadRequestException, Injectable } from '@nestjs/common';
import { LeaveRequestType } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { LeaveBalanceService } from './leave-balance.service';

export interface LeavePreviewInput {
  personId: string;
  startDate: string;
  endDate: string;
  type: LeaveRequestType;
}

export interface LeaveImpactPreviewDto {
  workingDaysRequested: number;
  skippedHolidays: string[];
  balanceAfter: number | null;
  conflictingPositionIds: string[];
  conflictingTeamLeaveIds: string[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * LEAN-P4-missing-11 — server-side leave-impact preview.
 *
 * Mirrors the client-side preview already in LeaveTab so callers get a
 * single source of truth before submitting (and so the calculation can
 * be reused by other surfaces — manager decision drawer, planner-side
 * simulation, etc).
 *
 *   workingDaysRequested  — calendar days in range, excluding Sat/Sun
 *                           and any matching PublicHoliday rows.
 *   balanceAfter          — balance.remaining - workingDaysRequested
 *                           for the requested type; null when no
 *                           balance row exists yet.
 *   conflictingPositionIds     — ProjectPosition ids actively filled by
 *                                this person overlapping the range
 *                                (fillStatus in {BOOKED,ONBOARDING,
 *                                ASSIGNED} and allocation > 0). Post-lean:
 *                                positions replaced ProjectAssignment as
 *                                the staffing aggregate.
 *   conflictingTeamLeaveIds    — other PENDING/APPROVED LeaveRequest ids
 *                                in the same OrgUnit whose date range
 *                                overlaps. Surfaces "too many of the
 *                                team out at once" risk.
 */
@Injectable()
export class LeaveImpactPreviewService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: LeaveBalanceService,
  ) {}

  public async preview(input: LeavePreviewInput): Promise<LeaveImpactPreviewDto> {
    const start = parseDate(input.startDate, 'startDate');
    const end = parseDate(input.endDate, 'endDate');
    if (end < start) {
      throw new BadRequestException('endDate must not be before startDate');
    }

    const holidayKeys = await this.fetchHolidayKeys(start, end);
    const { workingDaysRequested, skippedHolidays } = countWorkingDays(start, end, holidayKeys);

    const balanceAfter = await this.computeBalanceAfter(
      input.personId,
      input.type,
      start.getUTCFullYear(),
      workingDaysRequested,
    );

    const conflictingPositionIds = await this.findConflictingPositionIds(
      input.personId,
      start,
      end,
    );

    const conflictingTeamLeaveIds = await this.findConflictingTeamLeaveIds(
      input.personId,
      start,
      end,
    );

    return {
      workingDaysRequested,
      skippedHolidays,
      balanceAfter,
      conflictingPositionIds,
      conflictingTeamLeaveIds,
    };
  }

  private async fetchHolidayKeys(start: Date, end: Date): Promise<Set<string>> {
    const holidays = await this.prisma.publicHoliday.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    });
    return new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
  }

  private async computeBalanceAfter(
    personId: string,
    type: LeaveRequestType,
    year: number,
    workingDays: number,
  ): Promise<number | null> {
    const balances = await this.balanceService.getBalances(personId, year);
    const match = balances.find((b) => b.leaveType === type);
    if (!match) return null;
    return match.remaining - workingDays;
  }

  /**
   * Post-lean: query ProjectPosition (the consolidated staffing aggregate)
   * for any position actively filled by this person whose active-fill
   * window overlaps the requested leave range.
   *
   * Filters:
   *   - activePersonId = this person
   *   - fillStatus in {BOOKED, ONBOARDING, ASSIGNED}  (excludes DRAFT/
   *     OPEN/PROPOSED/RELEASED/ON_HOLD)
   *   - active fill window overlaps [start, end]
   *   - activeAllocationPercent > 0 (post-filter — 0 / null is a no-op fill)
   *   - archivedAt is null
   */
  private async findConflictingPositionIds(
    personId: string,
    start: Date,
    end: Date,
  ): Promise<string[]> {
    const rows = await this.prisma.projectPosition.findMany({
      where: {
        activePersonId: personId,
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED'] },
        archivedAt: null,
        activeValidFrom: { lte: end },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: start } }],
      },
      select: { id: true, activeAllocationPercent: true },
    });
    return rows
      .filter((r) => r.activeAllocationPercent == null || Number(r.activeAllocationPercent) > 0)
      .map((r) => r.id);
  }

  private async findConflictingTeamLeaveIds(
    personId: string,
    start: Date,
    end: Date,
  ): Promise<string[]> {
    // OrgUnit lives on PersonOrgMembership, not Person directly. Use the
    // primary current membership as the team boundary.
    const membership = await this.prisma.personOrgMembership.findFirst({
      where: {
        personId,
        archivedAt: null,
        validFrom: { lte: end },
        OR: [{ validTo: null }, { validTo: { gte: start } }],
      },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
      select: { orgUnitId: true },
    });
    if (!membership?.orgUnitId) return [];

    const teammates = await this.prisma.personOrgMembership.findMany({
      where: {
        orgUnitId: membership.orgUnitId,
        archivedAt: null,
        validFrom: { lte: end },
        OR: [{ validTo: null }, { validTo: { gte: start } }],
        personId: { not: personId },
      },
      select: { personId: true },
    });
    if (teammates.length === 0) return [];

    const teammateIds = Array.from(new Set(teammates.map((m) => m.personId)));

    const overlapping = await this.prisma.leaveRequest.findMany({
      where: {
        personId: { in: teammateIds },
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true },
    });
    return overlapping.map((r) => r.id);
  }
}

function parseDate(raw: string, label: string): Date {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) throw new BadRequestException(`${label} is required`);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${label} is not a valid date`);
  return d;
}

function countWorkingDays(
  start: Date,
  end: Date,
  holidayKeys: Set<string>,
): { workingDaysRequested: number; skippedHolidays: string[] } {
  const startKey = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endKey = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  let workingDays = 0;
  const skippedHolidays: string[] = [];
  for (let ts = startKey; ts <= endKey; ts += MS_PER_DAY) {
    const d = new Date(ts);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    if (holidayKeys.has(iso)) {
      skippedHolidays.push(iso);
      continue;
    }
    workingDays += 1;
  }
  return { workingDaysRequested: workingDays, skippedHolidays };
}
