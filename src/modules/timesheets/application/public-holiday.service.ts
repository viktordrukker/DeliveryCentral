import { Injectable } from '@nestjs/common';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface PublicHolidayDto {
  id: string;
  date: string;
  name: string;
  countryCode: string;
}

/**
 * F-7.2 / D-163 — multi-region PublicHoliday lookup.
 *
 * Each row still carries a single `countryCode` (the DB shape stays
 * single-string for query simplicity), but callers can now pass an
 * array of region codes to fetch holidays for multiple jurisdictions
 * in a single round-trip (e.g. `['US', 'US-CA']` for a Californian
 * employee who observes both federal and state holidays).
 *
 * The single-region API (`countryCode?: string`) stays for callers
 * that only care about a single jurisdiction. When omitted, the
 * service consults the `general.countryCode` PlatformSetting (tenant
 * default) and falls back to `'AU'` only when that setting is also
 * unset — preserving the pre-D-163 behavior for tenants that haven't
 * yet configured a default.
 */
@Injectable()
export class PublicHolidayService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings?: PlatformSettingsService,
  ) {}

  private async resolveRegionCodes(
    regionCodes: string[] | string | undefined,
  ): Promise<string[]> {
    if (Array.isArray(regionCodes) && regionCodes.length > 0) return regionCodes;
    if (typeof regionCodes === 'string' && regionCodes.length > 0) return [regionCodes];
    if (this.platformSettings) {
      const fromSetting = await this.platformSettings.getRawValue('general.countryCode');
      if (typeof fromSetting === 'string' && fromSetting.length > 0) return [fromSetting];
    }
    return ['AU'];
  }

  public async list(
    year: number,
    regionCodes?: string[] | string,
  ): Promise<PublicHolidayDto[]> {
    const codes = await this.resolveRegionCodes(regionCodes);
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year, 11, 31));
    const holidays = await this.prisma.publicHoliday.findMany({
      where: { countryCode: { in: codes }, date: { gte: from, lte: to } },
      orderBy: [{ date: 'asc' }, { countryCode: 'asc' }],
    });
    return holidays.map((h) => ({
      id: h.id,
      date: h.date.toISOString().slice(0, 10),
      name: h.name,
      countryCode: h.countryCode,
    }));
  }

  /** Returns set of date strings (YYYY-MM-DD) that are public holidays in a given month. */
  public async getHolidayDatesForMonth(
    year: number,
    month: number,
    regionCodes?: string[] | string,
  ): Promise<Set<string>> {
    const codes = await this.resolveRegionCodes(regionCodes);
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0)); // last day of month
    const holidays = await this.prisma.publicHoliday.findMany({
      where: { countryCode: { in: codes }, date: { gte: from, lte: to } },
      select: { date: true },
    });
    return new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
  }

  /** Count working days in a month (Mon–Fri minus public holidays). */
  public async workingDaysInMonth(
    year: number,
    month: number,
    regionCodes?: string[] | string,
  ): Promise<number> {
    const holidays = await this.getHolidayDatesForMonth(year, month, regionCodes);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const dayOfWeek = date.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // weekend
      const dateStr = date.toISOString().slice(0, 10);
      if (holidays.has(dateStr)) continue;
      count++;
    }
    return count;
  }
}
