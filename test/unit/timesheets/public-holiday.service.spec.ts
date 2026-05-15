import { PublicHolidayService } from '@src/modules/timesheets/application/public-holiday.service';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  date: Date;
  name: string;
  countryCode: string;
}

function buildPrisma(rows: FakeRow[]): PrismaService {
  return {
    publicHoliday: {
      findMany: async (args: {
        where: { countryCode: { in: string[] }; date: { gte: Date; lte: Date } };
        select?: unknown;
      }): Promise<FakeRow[]> => {
        const allowedRegions = new Set(args.where.countryCode.in);
        return rows.filter(
          (r) =>
            allowedRegions.has(r.countryCode) &&
            r.date >= args.where.date.gte &&
            r.date <= args.where.date.lte,
        );
      },
    },
  } as unknown as PrismaService;
}

function buildSettings(value: unknown): PlatformSettingsService {
  return {
    getRawValue: async () => value,
  } as unknown as PlatformSettingsService;
}

describe('PublicHolidayService (F-7.2 / D-163 multi-region)', () => {
  const fixture: FakeRow[] = [
    { id: 'h1', date: new Date('2026-01-01T00:00:00Z'), name: "New Year's Day", countryCode: 'AU' },
    { id: 'h2', date: new Date('2026-01-26T00:00:00Z'), name: 'Australia Day', countryCode: 'AU' },
    { id: 'h3', date: new Date('2026-01-01T00:00:00Z'), name: "New Year's Day", countryCode: 'US' },
    { id: 'h4', date: new Date('2026-07-04T00:00:00Z'), name: 'Independence Day', countryCode: 'US' },
    { id: 'h5', date: new Date('2026-12-25T00:00:00Z'), name: 'Christmas', countryCode: 'GB' },
  ];

  it('list() with no region falls back to tenant default from PlatformSettings', async () => {
    const svc = new PublicHolidayService(buildPrisma(fixture), buildSettings('US'));
    const out = await svc.list(2026);
    expect(out.map((h) => h.id).sort()).toEqual(['h3', 'h4']);
  });

  it('list() falls back to AU when neither caller nor tenant default supply a region', async () => {
    const svc = new PublicHolidayService(buildPrisma(fixture), buildSettings(null));
    const out = await svc.list(2026);
    expect(out.map((h) => h.id).sort()).toEqual(['h1', 'h2']);
  });

  it('list() with a single region string scopes correctly', async () => {
    const svc = new PublicHolidayService(buildPrisma(fixture), buildSettings('US'));
    const out = await svc.list(2026, 'GB');
    expect(out.map((h) => h.id).sort()).toEqual(['h5']);
  });

  it('list() with a region array fetches all matching jurisdictions in one round-trip', async () => {
    const svc = new PublicHolidayService(buildPrisma(fixture), buildSettings(null));
    const out = await svc.list(2026, ['US', 'GB']);
    expect(out.map((h) => h.id).sort()).toEqual(['h3', 'h4', 'h5']);
  });

  it('getHolidayDatesForMonth() returns a Set of date strings for the resolved region', async () => {
    const svc = new PublicHolidayService(buildPrisma(fixture), buildSettings(null));
    const out = await svc.getHolidayDatesForMonth(2026, 1, 'US');
    expect(out.has('2026-01-01')).toBe(true);
    expect(out.has('2026-07-04')).toBe(false);
  });

  it('workingDaysInMonth() subtracts holidays from Mon–Fri days', async () => {
    const svc = new PublicHolidayService(buildPrisma(fixture), buildSettings(null));
    // Jan 2026: 31 days; 22 weekdays. AU has 2 weekday holidays
    // (2026-01-01 Thu New Year's Day, 2026-01-26 Mon Australia Day).
    const auWorkingDays = await svc.workingDaysInMonth(2026, 1, 'AU');
    expect(auWorkingDays).toBe(20);
  });

  it('list() works when constructed without a PlatformSettingsService (legacy callers)', async () => {
    const svc = new PublicHolidayService(buildPrisma(fixture));
    const out = await svc.list(2026, 'GB');
    expect(out.map((h) => h.id).sort()).toEqual(['h5']);
  });
});
