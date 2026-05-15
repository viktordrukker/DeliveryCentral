import { FiscalCalendarService } from '@src/modules/financial-governance/application/fiscal-calendar.service';
import type { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeCalendar {
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
}

function buildPrisma(calendars: FakeCalendar[]): PrismaService {
  return {
    fiscalCalendar: {
      findFirst: jest.fn(
        async (args: {
          where: {
            fiscalYear?: number;
            regionCode?: string | null;
            startDate?: { lte: Date };
            endDate?: { gte: Date };
          };
          include?: unknown;
          orderBy?: unknown;
        }): Promise<FakeCalendar | null> => {
          const w = args.where;
          const matches = calendars.filter((c) => {
            if (w.fiscalYear !== undefined && c.fiscalYear !== w.fiscalYear) return false;
            if (w.regionCode !== undefined && c.regionCode !== w.regionCode) return false;
            if (w.startDate && c.startDate > w.startDate.lte) return false;
            if (w.endDate && c.endDate < w.endDate.gte) return false;
            return true;
          });
          if (matches.length === 0) return null;
          // Mimic Prisma's behavior — pick the highest fiscalYear when sorting desc.
          matches.sort((a, b) => b.fiscalYear - a.fiscalYear);
          return matches[0];
        },
      ),
    },
  } as unknown as PrismaService;
}

function buildFlags(enabled: boolean): PlatformFlagsService {
  return {
    isEnabled: jest.fn(async () => enabled),
  } as unknown as PlatformFlagsService;
}

const FY2026_GB: FakeCalendar = {
  id: 'cal-gb-2026',
  name: 'FY2026-GB',
  fiscalYear: 2026,
  startDate: new Date('2026-04-01'),
  endDate: new Date('2027-03-31'),
  regionCode: 'GB',
  periods: [
    { periodNumber: 1, quarter: 1, startDate: new Date('2026-04-01'), endDate: new Date('2026-04-30'), label: 'Apr' },
    { periodNumber: 2, quarter: 1, startDate: new Date('2026-05-01'), endDate: new Date('2026-05-31'), label: 'May' },
    { periodNumber: 3, quarter: 1, startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), label: 'Jun' },
    { periodNumber: 4, quarter: 2, startDate: new Date('2026-07-01'), endDate: new Date('2026-07-31'), label: 'Jul' },
    { periodNumber: 5, quarter: 2, startDate: new Date('2026-08-01'), endDate: new Date('2026-08-31'), label: 'Aug' },
    { periodNumber: 6, quarter: 2, startDate: new Date('2026-09-01'), endDate: new Date('2026-09-30'), label: 'Sep' },
    { periodNumber: 7, quarter: 3, startDate: new Date('2026-10-01'), endDate: new Date('2026-10-31'), label: 'Oct' },
    { periodNumber: 8, quarter: 3, startDate: new Date('2026-11-01'), endDate: new Date('2026-11-30'), label: 'Nov' },
    { periodNumber: 9, quarter: 3, startDate: new Date('2026-12-01'), endDate: new Date('2026-12-31'), label: 'Dec' },
    { periodNumber: 10, quarter: 4, startDate: new Date('2027-01-01'), endDate: new Date('2027-01-31'), label: 'Jan' },
    { periodNumber: 11, quarter: 4, startDate: new Date('2027-02-01'), endDate: new Date('2027-02-28'), label: 'Feb' },
    { periodNumber: 12, quarter: 4, startDate: new Date('2027-03-01'), endDate: new Date('2027-03-31'), label: 'Mar' },
  ],
};

describe('FiscalCalendarService (F-7.5 / D-160b)', () => {
  describe('getCalendar', () => {
    it('returns the calendar for a (year, region) lookup', async () => {
      const svc = new FiscalCalendarService(buildPrisma([FY2026_GB]), buildFlags(false));
      const cal = await svc.getCalendar(2026, 'GB');
      expect(cal?.name).toBe('FY2026-GB');
      expect(cal?.periods).toHaveLength(12);
    });

    it('returns null when no calendar exists for the year', async () => {
      const svc = new FiscalCalendarService(buildPrisma([FY2026_GB]), buildFlags(false));
      expect(await svc.getCalendar(2027, 'GB')).toBeNull();
    });
  });

  describe('findContaining', () => {
    it('returns the calendar whose window contains the date', async () => {
      const svc = new FiscalCalendarService(buildPrisma([FY2026_GB]), buildFlags(false));
      const cal = await svc.findContaining(new Date('2026-08-15'), 'GB');
      expect(cal?.fiscalYear).toBe(2026);
    });

    it('returns null when no calendar covers the date', async () => {
      const svc = new FiscalCalendarService(buildPrisma([FY2026_GB]), buildFlags(false));
      expect(await svc.findContaining(new Date('2099-01-01'), 'GB')).toBeNull();
    });
  });

  describe('quarterOf', () => {
    it('returns the correct quarter for a date inside the FY', async () => {
      const svc = new FiscalCalendarService(buildPrisma([FY2026_GB]), buildFlags(false));
      // 2026-08-15 → period 5 (Aug) → quarter 2
      expect(await svc.quarterOf(new Date('2026-08-15'), 'GB')).toBe(2);
      // 2027-02-10 → period 11 (Feb) → quarter 4
      expect(await svc.quarterOf(new Date('2027-02-10'), 'GB')).toBe(4);
      // 2026-04-01 → period 1 (Apr) → quarter 1
      expect(await svc.quarterOf(new Date('2026-04-01'), 'GB')).toBe(1);
    });

    it('returns null when the date is outside any calendar', async () => {
      const svc = new FiscalCalendarService(buildPrisma([FY2026_GB]), buildFlags(false));
      expect(await svc.quarterOf(new Date('2099-01-01'), 'GB')).toBeNull();
    });
  });

  describe('isEnabled', () => {
    it('reflects the flag state', async () => {
      const on = new FiscalCalendarService(buildPrisma([]), buildFlags(true));
      const off = new FiscalCalendarService(buildPrisma([]), buildFlags(false));
      expect(await on.isEnabled()).toBe(true);
      expect(await off.isEnabled()).toBe(false);
    });
  });

  describe('buildMonthlyPeriods (pure helper)', () => {
    it('returns 12 periods grouped 3-3-3-3 into quarters', () => {
      const periods = FiscalCalendarService.buildMonthlyPeriods(new Date(Date.UTC(2026, 3, 1))); // Apr 1
      expect(periods).toHaveLength(12);
      expect(periods[0].quarter).toBe(1);
      expect(periods[2].quarter).toBe(1);
      expect(periods[3].quarter).toBe(2);
      expect(periods[5].quarter).toBe(2);
      expect(periods[6].quarter).toBe(3);
      expect(periods[8].quarter).toBe(3);
      expect(periods[9].quarter).toBe(4);
      expect(periods[11].quarter).toBe(4);
    });

    it('first period spans the supplied start month', () => {
      const periods = FiscalCalendarService.buildMonthlyPeriods(new Date(Date.UTC(2026, 3, 1))); // Apr 1
      expect(periods[0].startDate.toISOString().slice(0, 10)).toBe('2026-04-01');
      expect(periods[0].endDate.toISOString().slice(0, 10)).toBe('2026-04-30');
      expect(periods[11].endDate.toISOString().slice(0, 10)).toBe('2027-03-31');
    });
  });
});
