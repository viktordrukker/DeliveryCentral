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
});
