import { WorkforcePlannerService } from '@src/modules/staffing-desk/application/workforce-planner.service';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Regression: GET /api/staffing-desk/planner 500'd with
 * RangeError("Invalid time value") when `from` was missing/unparseable —
 * `new Date(from)` produced an Invalid Date and `d.toISOString()` threw,
 * taking down the entire Planner view (observed live on v2 staging 2026-06-13).
 * getPlan must default a missing `from` to the current week's UTC Monday.
 */
describe('WorkforcePlannerService.getPlan — robust `from` handling', () => {
  function buildService(): WorkforcePlannerService {
    const emptyFindMany = { findMany: async () => [] as unknown[] };
    const prisma = {
      person: emptyFindMany,
      personCostRate: emptyFindMany,
      personOrgMembership: emptyFindMany,
      personResourcePoolMembership: emptyFindMany,
      personSkill: emptyFindMany,
      project: emptyFindMany,
      projectPosition: emptyFindMany,
      projectPositionFillHistory: emptyFindMany,
      projectRolePlan: emptyFindMany,
      skill: emptyFindMany,
    } as unknown as PrismaService;
    const settings = { getRawValue: async () => null } as unknown as PlatformSettingsService;
    return new WorkforcePlannerService(prisma, settings);
  }

  const isMondayIso = (s: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return new Date(`${s}T00:00:00Z`).getUTCDay() === 1;
  };

  it('defaults a missing `from` to the current week Monday instead of throwing', async () => {
    const service = buildService();
    const res = await service.getPlan({
      from: undefined as unknown as string,
      weeks: 13,
      includeDrafts: false,
    });
    expect(res.weeks.length).toBe(13);
    expect(isMondayIso(res.weeks[0])).toBe(true);
  });

  it('defaults an unparseable `from` instead of throwing', async () => {
    const service = buildService();
    const res = await service.getPlan({ from: 'not-a-date', weeks: 4, includeDrafts: false });
    expect(res.weeks.length).toBe(4);
    expect(isMondayIso(res.weeks[0])).toBe(true);
  });

  it('honors a valid `from`', async () => {
    const service = buildService();
    const res = await service.getPlan({ from: '2026-09-07', weeks: 2, includeDrafts: false });
    expect(res.weeks[0]).toBe('2026-09-07'); // a Monday
    expect(res.weeks[1]).toBe('2026-09-14');
  });

  // Recursively collect any Invalid Date (NaN time) reachable in an object —
  // this is what Prisma rejects with PrismaClientValidationError at runtime.
  const invalidDatesIn = (value: unknown, found: Date[] = []): Date[] => {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) found.push(value);
    } else if (Array.isArray(value)) {
      for (const v of value) invalidDatesIn(v, found);
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) invalidDatesIn(v, found);
    }
    return found;
  };

  it('passes no Invalid Date into any Prisma date filter when `from` is missing', async () => {
    // The empty-[] stub above never validates query args, so it could not catch
    // the *second* failure mode: a missing `from` produced `new Date(from)`
    // (Invalid Date) inside `project.findMany`/`projectPosition.findMany` date
    // filters → PrismaClientValidationError → planner 500 (live on v2 staging
    // 2026-06-13, after the toISOString guard alone). Here we record every
    // findMany `where` and assert no Invalid Date reaches it.
    const calls: unknown[] = [];
    const recording = { findMany: async (args: unknown) => { calls.push(args); return [] as unknown[]; } };
    const prisma = {
      person: recording,
      personCostRate: recording,
      personOrgMembership: recording,
      personResourcePoolMembership: recording,
      personSkill: recording,
      project: recording,
      projectPosition: recording,
      projectPositionFillHistory: recording,
      projectRolePlan: recording,
      skill: recording,
    } as unknown as PrismaService;
    const settings = { getRawValue: async () => null } as unknown as PlatformSettingsService;
    const service = new WorkforcePlannerService(prisma, settings);

    await service.getPlan({ from: undefined as unknown as string, weeks: 13, includeDrafts: false });

    const bad = calls.flatMap((c) => invalidDatesIn(c));
    expect(bad).toHaveLength(0);
  });
});
