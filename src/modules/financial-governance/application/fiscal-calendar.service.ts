import { Injectable, Logger } from '@nestjs/common';

import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface FiscalCalendarPeriod {
  periodNumber: number;
  quarter: number;
  startDate: Date;
  endDate: Date;
  label: string | null;
}

export interface FiscalCalendarDetail {
  id: string;
  name: string;
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
  regionCode: string | null;
  periods: FiscalCalendarPeriod[];
}

/**
 * F-7.5 / D-160b — FiscalCalendar service.
 *
 * Wraps the `fiscal_calendars` + `fiscal_periods` tables with the
 * lookup operations that report-side code needs:
 *
 *   - `getCalendar(fiscalYear, regionCode?)` — fetches a calendar by
 *     (year, region) tuple. NULL region means tenant-default.
 *   - `findContaining(date, regionCode?)` — returns the calendar whose
 *     [startDate, endDate] window includes the given date.
 *   - `quarterOf(date, regionCode?)` — returns the 1–4 quarter index
 *     within the containing calendar, or null when no calendar
 *     covers the date.
 *
 * The flag `flag.feature.financial.fiscalCalendar.entity.enabled`
 * gates whether callers should consult this service at all. When the
 * flag is OFF, financial reports stay on the D-160a quick-fix path
 * (just consume `general.fiscalYearStart`). The service still works
 * with the flag OFF — flag-gating is the CALLER's responsibility
 * (this service is happy to answer queries either way).
 */
@Injectable()
export class FiscalCalendarService {
  private readonly logger = new Logger(FiscalCalendarService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly flags: PlatformFlagsService,
  ) {}

  public async isEnabled(): Promise<boolean> {
    return this.flags.isEnabled('financialFiscalCalendarEntity');
  }

  public async getCalendar(
    fiscalYear: number,
    regionCode: string | null = null,
  ): Promise<FiscalCalendarDetail | null> {
    // Use `findFirst` instead of `findUnique` because Prisma's composite-
    // unique typing demands a non-null `regionCode`; we genuinely want
    // NULL to mean "tenant-default calendar".
    const row = await this.prisma.fiscalCalendar.findFirst({
      where: { fiscalYear, regionCode },
      include: { periods: { orderBy: { periodNumber: 'asc' } } },
    });
    if (!row) return null;
    return this.mapDetail(row);
  }

  public async findContaining(
    date: Date,
    regionCode: string | null = null,
  ): Promise<FiscalCalendarDetail | null> {
    const row = await this.prisma.fiscalCalendar.findFirst({
      where: {
        regionCode,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: { periods: { orderBy: { periodNumber: 'asc' } } },
      orderBy: { fiscalYear: 'desc' },
    });
    if (!row) return null;
    return this.mapDetail(row);
  }

  public async quarterOf(date: Date, regionCode: string | null = null): Promise<number | null> {
    const calendar = await this.findContaining(date, regionCode);
    if (!calendar) return null;
    for (const p of calendar.periods) {
      if (date >= p.startDate && date <= p.endDate) return p.quarter;
    }
    return null;
  }

  /**
   * Build a 12-period monthly calendar starting at `startDate`. Pure
   * helper — does NOT persist. Callers seed by passing the result to
   * `prisma.fiscalCalendar.create({ data: { …, periods: { createMany: { data } } } })`.
   *
   * Each period spans calendar-month boundaries inside the fiscal
   * year. Quarters are 3-month groupings: P1–P3 → Q1, P4–P6 → Q2, etc.
   */
  public static buildMonthlyPeriods(startDate: Date): FiscalCalendarPeriod[] {
    const periods: FiscalCalendarPeriod[] = [];
    const cursor = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ));
    for (let i = 0; i < 12; i++) {
      const periodStart = new Date(cursor);
      // Move cursor to the first of the next month, then back one day to land on the period end.
      const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
      const periodEnd = new Date(nextMonth.getTime() - 86_400_000);
      periods.push({
        periodNumber: i + 1,
        quarter: Math.floor(i / 3) + 1,
        startDate: periodStart,
        endDate: periodEnd,
        label: null,
      });
      cursor.setTime(nextMonth.getTime());
    }
    return periods;
  }

  private mapDetail(row: {
    id: string;
    name: string;
    fiscalYear: number;
    startDate: Date;
    endDate: Date;
    regionCode: string | null;
    periods: Array<{
      periodNumber: number;
      quarter: number;
      startDate: Date;
      endDate: Date;
      label: string | null;
    }>;
  }): FiscalCalendarDetail {
    return {
      id: row.id,
      name: row.name,
      fiscalYear: row.fiscalYear,
      startDate: row.startDate,
      endDate: row.endDate,
      regionCode: row.regionCode,
      periods: row.periods.map((p) => ({
        periodNumber: p.periodNumber,
        quarter: p.quarter,
        startDate: p.startDate,
        endDate: p.endDate,
        label: p.label,
      })),
    };
  }
}
