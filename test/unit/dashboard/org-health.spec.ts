import { OrgHealthService } from '@src/modules/dashboard/application/org-health.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeOrgUnit {
  id: string;
  code: string;
  name: string;
}

interface FakeMembership {
  personId: string;
  orgUnitId: string;
}

interface FakePosition {
  activePersonId: string | null;
}

function buildStub(seed: {
  orgUnits: FakeOrgUnit[];
  memberships: FakeMembership[];
  positions: FakePosition[];
}): PrismaService {
  const orgUnit = { findMany: async (_q: unknown) => seed.orgUnits };
  const personOrgMembership = { findMany: async (_q: unknown) => seed.memberships };
  const projectPosition = { findMany: async (_q: unknown) => seed.positions };
  return { orgUnit, personOrgMembership, projectPosition } as unknown as PrismaService;
}

describe('OrgHealthService (LEAN-P4-missing-5)', () => {
  it('returns zero metrics when no org units exist', async () => {
    const svc = new OrgHealthService(
      buildStub({ orgUnits: [], memberships: [], positions: [] }),
    );
    const result = await svc.execute();
    expect(result.units).toEqual([]);
    expect(result.totalHeadcount).toBe(0);
    expect(result.totalBenchSize).toBe(0);
    expect(result.portfolioUnfillRatePct).toBe(0);
  });

  it('aggregates headcount and bench by org unit, intersecting against active positions', async () => {
    const svc = new OrgHealthService(
      buildStub({
        orgUnits: [
          { id: 'u-eng', code: 'ENG', name: 'Engineering' },
          { id: 'u-ops', code: 'OPS', name: 'Operations' },
        ],
        memberships: [
          { personId: 'p1', orgUnitId: 'u-eng' },
          { personId: 'p2', orgUnitId: 'u-eng' },
          { personId: 'p3', orgUnitId: 'u-eng' },
          { personId: 'p4', orgUnitId: 'u-eng' },
          { personId: 'p5', orgUnitId: 'u-ops' },
          { personId: 'p6', orgUnitId: 'u-ops' },
        ],
        positions: [
          { activePersonId: 'p1' },
          { activePersonId: 'p2' },
          // p3 + p4 on bench in Engineering
          { activePersonId: 'p5' },
          // p6 on bench in Operations
        ],
      }),
    );
    const result = await svc.execute('2026-06-05T00:00:00.000Z');

    expect(result.units).toHaveLength(2);
    const ops = result.units.find((u) => u.orgUnitCode === 'OPS')!;
    const eng = result.units.find((u) => u.orgUnitCode === 'ENG')!;

    expect(eng.headcount).toBe(4);
    expect(eng.staffedCount).toBe(2);
    expect(eng.benchSize).toBe(2);
    expect(eng.unfillRatePct).toBe(50);

    expect(ops.headcount).toBe(2);
    expect(ops.staffedCount).toBe(1);
    expect(ops.benchSize).toBe(1);
    expect(ops.unfillRatePct).toBe(50);

    expect(result.totalHeadcount).toBe(6);
    expect(result.totalBenchSize).toBe(3);
    expect(result.portfolioUnfillRatePct).toBe(50);
  });

  it('sorts units by unfill rate desc, then headcount desc', async () => {
    const svc = new OrgHealthService(
      buildStub({
        orgUnits: [
          { id: 'u-a', code: 'A', name: 'Alpha' }, // 1/2 → 50%
          { id: 'u-b', code: 'B', name: 'Beta' }, // 2/2 → 100%
          { id: 'u-c', code: 'C', name: 'Gamma' }, // 5/10 → 50%
        ],
        memberships: [
          { personId: 'a1', orgUnitId: 'u-a' },
          { personId: 'a2', orgUnitId: 'u-a' },
          { personId: 'b1', orgUnitId: 'u-b' },
          { personId: 'b2', orgUnitId: 'u-b' },
          ...Array.from({ length: 10 }, (_, i) => ({
            personId: `c${i + 1}`,
            orgUnitId: 'u-c',
          })),
        ],
        positions: [
          { activePersonId: 'a1' },
          // b1, b2 → all on bench
          ...Array.from({ length: 5 }, (_, i) => ({ activePersonId: `c${i + 1}` })),
        ],
      }),
    );
    const result = await svc.execute();
    expect(result.units.map((u) => u.orgUnitCode)).toEqual(['B', 'C', 'A']);
  });

  it('treats headcount=0 as unfillRate=0 (no division by zero)', async () => {
    const svc = new OrgHealthService(
      buildStub({
        orgUnits: [{ id: 'u-empty', code: 'EMP', name: 'Empty Unit' }],
        memberships: [],
        positions: [],
      }),
    );
    const result = await svc.execute();
    expect(result.units[0]).toEqual({
      orgUnitId: 'u-empty',
      orgUnitCode: 'EMP',
      orgUnitName: 'Empty Unit',
      headcount: 0,
      staffedCount: 0,
      benchSize: 0,
      unfillRatePct: 0,
    });
    expect(result.portfolioUnfillRatePct).toBe(0);
  });

  it('skips a person counted in staffedPersonIds if they belong to no membership', async () => {
    const svc = new OrgHealthService(
      buildStub({
        orgUnits: [{ id: 'u-eng', code: 'ENG', name: 'Engineering' }],
        memberships: [{ personId: 'p1', orgUnitId: 'u-eng' }],
        positions: [
          { activePersonId: 'p1' },
          { activePersonId: 'p-orphan' }, // not in any unit — ignored
        ],
      }),
    );
    const result = await svc.execute();
    expect(result.units[0].staffedCount).toBe(1);
    expect(result.units[0].headcount).toBe(1);
    expect(result.units[0].benchSize).toBe(0);
  });

  it('rounds unfill rate to one decimal place', async () => {
    const svc = new OrgHealthService(
      buildStub({
        orgUnits: [{ id: 'u-eng', code: 'ENG', name: 'Engineering' }],
        memberships: Array.from({ length: 3 }, (_, i) => ({
          personId: `p${i + 1}`,
          orgUnitId: 'u-eng',
        })),
        positions: [{ activePersonId: 'p1' }],
      }),
    );
    const result = await svc.execute();
    // 2/3 = 0.6666 → 66.7%
    expect(result.units[0].unfillRatePct).toBe(66.7);
  });

  it('rejects an invalid asOf', async () => {
    const svc = new OrgHealthService(
      buildStub({ orgUnits: [], memberships: [], positions: [] }),
    );
    await expect(svc.execute('not-a-date')).rejects.toThrow(/asOf is invalid/);
  });

  it('echoes asOf in the response', async () => {
    const svc = new OrgHealthService(
      buildStub({ orgUnits: [], memberships: [], positions: [] }),
    );
    const result = await svc.execute('2026-06-05T12:00:00.000Z');
    expect(result.asOf).toBe('2026-06-05T12:00:00.000Z');
  });
});
