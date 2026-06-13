/**
 * PR-16 (Decision E) — cross-surface "open demand" consistency.
 *
 * Three surfaces historically each invented their own answer to "what is open
 * demand?": the Director KPI counted RolePlan planned-minus-filled, the
 * staffing desk lumped OPEN + PROPOSED into one bucket, and bench matching read
 * only OPEN. They could (and did) disagree on the same dataset.
 *
 * The canonical source of truth is `ProjectPosition.fillStatus`:
 *   - OPEN     ⇒ open demand
 *   - PROPOSED ⇒ in-progress demand (counted separately, never as "open")
 *
 * This spec drives the same in-memory dataset through all three surfaces and
 * pins the contract: Director-KPI open count == bench-matching pool count ==
 * staffing-desk OPEN count. A regression on any surface fails here.
 */
import { PortfolioDashboardService } from '@src/modules/dashboard/application/portfolio-dashboard.service';
import { SuggestFillsService } from '@src/modules/project-positions/application/suggest-fills.service';
import { StaffingDeskService } from '@src/modules/staffing-desk/application/staffing-desk.service';
import { openDemandWhere } from '@src/shared/persistence/active-fill-window';
import type { ProjectRolePlanService } from '@src/modules/project-registry/application/project-role-plan.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/** One shared dataset of positions. fillStatus drives every surface's count. */
interface SeedPosition {
  id: string;
  projectId: string;
  role: string;
  skills: string[];
  fillStatus: string;
  activePersonId: string | null;
  activeValidFrom: Date | null;
  activeValidTo: Date | null;
  activeAllocationPercent: number | null;
  requiredAllocationPercent: number | null;
  // Scalars the staffing-desk row mapper reads (it serializes these).
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  requestedByPersonId: string | null;
  summary: string | null;
  priority: string | null;
  legacyAssignmentId: string | null;
  legacyStaffingRequestId: string | null;
  publicId?: string | null;
  project?: { name: string };
}

interface SeedPerson {
  id: string;
  displayName: string;
  role: string | null;
  grade: string | null;
}

/** Matches the OPEN/PROPOSED filter shapes the surfaces emit against fillStatus. */
function matchesFillStatus(where: unknown, status: string): boolean {
  const fs = (where as { fillStatus?: unknown })?.fillStatus;
  if (fs === undefined) return true;
  if (typeof fs === 'string') return fs === status;
  const inList = (fs as { in?: string[] })?.in;
  if (Array.isArray(inList)) return inList.includes(status);
  return false;
}

function buildStub(seed: { positions: SeedPosition[]; people: SeedPerson[] }): PrismaService {
  const positionMatches = (where: unknown): SeedPosition[] =>
    seed.positions.filter((p) => matchesFillStatus(where, p.fillStatus));

    // Prisma maps Decimal columns to Decimal.js at runtime (has .toNumber()).
    const dec = (n: number | null) => (n === null ? null : { toNumber: () => n });
    const projectPosition = {
    count: async (q: { where?: unknown }) => positionMatches(q?.where).length,
    findMany: async (q: { where?: { activePersonId?: unknown } }) => {
      // availabilityHours14d's Σ-allocation read filters by a single personId.
      const ap = q?.where?.activePersonId;
      if (typeof ap === 'string') {
        return seed.positions
          .filter((p) => p.activePersonId === ap)
          .map((p) => ({
            activeAllocationPercent: dec(p.activeAllocationPercent),
            requiredAllocationPercent: dec(p.requiredAllocationPercent),
          }));
      }
      return positionMatches(q?.where).map((p) => ({
        ...p,
        activeAllocationPercent: dec(p.activeAllocationPercent),
        requiredAllocationPercent: dec(p.requiredAllocationPercent),
        project: p.project ?? { name: p.projectId },
      }));
    },
    groupBy: async () => [],
  };

  const person = {
    findMany: async (_q: unknown) =>
      seed.people.map((p) => ({ ...p, personSkills: [], email: null, employmentStatus: 'ACTIVE' })),
    findUnique: async (q: { where?: { id?: string } }) => {
      const found = seed.people.find((p) => p.id === q?.where?.id);
      return found ? { ...found, personSkills: [] } : null;
    },
  };

  const empty = { findMany: async () => [], aggregate: async () => ({ _sum: { headcount: 0 } }) };

  return {
    projectPosition,
    person,
    project: { findMany: async () => [] },
    projectVendorEngagement: empty,
    personOrgMembership: empty,
    personResourcePoolMembership: empty,
    personSkill: empty,
    reportingLine: empty,
    assignment: empty,
  } as unknown as PrismaService;
}

function stubRolePlanService(): ProjectRolePlanService {
  return {
    getRolePlan: async () => [],
    // Intentionally divergent from the canonical OPEN count: the old Director
    // KPI trusted this, which is exactly the bug Decision E removes.
    getRolePlanVsActual: async () => ({
      rows: [],
      totalPlanned: 99,
      totalFilled: 0,
      totalGap: 99,
      overallFillRate: 0,
    }),
  } as unknown as ProjectRolePlanService;
}

describe('PR-16 (Decision E) — open-demand cross-surface consistency', () => {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 86400000);
  const future = new Date(now.getTime() + 180 * 86400000);

  const pos = (p: Pick<SeedPosition, 'id' | 'projectId' | 'role' | 'skills' | 'fillStatus' | 'activePersonId' | 'activeAllocationPercent' | 'requiredAllocationPercent'> & Partial<SeedPosition>): SeedPosition => ({
    activeValidFrom: p.activePersonId ? past : null,
    activeValidTo: p.activePersonId ? future : null,
    startDate: past,
    endDate: future,
    createdAt: past,
    updatedAt: now,
    requestedByPersonId: null,
    summary: null,
    priority: null,
    legacyAssignmentId: null,
    legacyStaffingRequestId: null,
    ...p,
  });

  // 3 OPEN, 2 PROPOSED, 1 BOOKED, 1 ASSIGNED. Canonical open demand = 3.
  const positions: SeedPosition[] = [
    pos({ id: 'o1', projectId: 'pa', role: 'Engineer', skills: ['React'], fillStatus: 'OPEN', activePersonId: null, activeAllocationPercent: null, requiredAllocationPercent: 100 }),
    pos({ id: 'o2', projectId: 'pa', role: 'Engineer', skills: ['Node'], fillStatus: 'OPEN', activePersonId: null, activeAllocationPercent: null, requiredAllocationPercent: 100 }),
    pos({ id: 'o3', projectId: 'pb', role: 'Designer', skills: ['Figma'], fillStatus: 'OPEN', activePersonId: null, activeAllocationPercent: null, requiredAllocationPercent: 50 }),
    pos({ id: 'pr1', projectId: 'pa', role: 'Engineer', skills: ['React'], fillStatus: 'PROPOSED', activePersonId: null, activeAllocationPercent: null, requiredAllocationPercent: 100 }),
    pos({ id: 'pr2', projectId: 'pb', role: 'PM', skills: [], fillStatus: 'PROPOSED', activePersonId: null, activeAllocationPercent: null, requiredAllocationPercent: 100 }),
    pos({ id: 'b1', projectId: 'pa', role: 'Engineer', skills: ['React'], fillStatus: 'BOOKED', activePersonId: 'busy1', activeAllocationPercent: 100, requiredAllocationPercent: 100 }),
    pos({ id: 'a1', projectId: 'pb', role: 'Engineer', skills: ['Node'], fillStatus: 'ASSIGNED', activePersonId: 'busy2', activeAllocationPercent: 100, requiredAllocationPercent: 100 }),
  ];
  const people: SeedPerson[] = [
    { id: 'bench1', displayName: 'Ada', role: 'Engineer', grade: 'L5' },
    { id: 'busy1', displayName: 'Bo', role: 'Engineer', grade: 'L4' },
    { id: 'busy2', displayName: 'Cy', role: 'Engineer', grade: 'L3' },
  ];

  const EXPECTED_OPEN = 3;

  it('Director KPI open count == bench-matching pool count == desk OPEN count', async () => {
    const prisma = buildStub({ positions, people });

    // Director KPI — canonical OPEN demand on the portfolio summary.
    const director = new PortfolioDashboardService(prisma, stubRolePlanService());
    const directorOpen = (await director.getPortfolioSummary()).totalOpenGaps;

    // Bench matching — the pool of OPEN positions a bench person is matched
    // against (limit set high enough to capture every OPEN row).
    const suggest = new SuggestFillsService(prisma);
    const matchPool = (await suggest.suggestForPerson('bench1', 100)).candidates.length;

    // Staffing desk — the OPEN counter on the supply/demand panel.
    const desk = new StaffingDeskService(prisma);
    const deskOpen = (await desk.query({} as never)).supplyDemand.headcountOpen;

    expect(directorOpen).toBe(EXPECTED_OPEN);
    expect(matchPool).toBe(EXPECTED_OPEN);
    expect(deskOpen).toBe(EXPECTED_OPEN);
    // The contract: all three agree.
    expect(directorOpen).toBe(matchPool);
    expect(matchPool).toBe(deskOpen);
  });

  it('PROPOSED is counted as in-progress, never folded into the OPEN count', async () => {
    const prisma = buildStub({ positions, people });
    const desk = new StaffingDeskService(prisma);
    const sd = (await desk.query({} as never)).supplyDemand;

    expect(sd.headcountOpen).toBe(EXPECTED_OPEN); // OPEN only
    expect(sd.headcountInProgress).toBe(2); // the two PROPOSED rows
    // Demand headcount spans both buckets.
    expect(sd.totalHeadcountRequired).toBe(EXPECTED_OPEN + 2);
  });

  it('openDemandWhere is the single predicate every surface routes through', () => {
    expect(openDemandWhere()).toEqual({ fillStatus: 'OPEN' });
    expect(openDemandWhere({ projectId: 'pa' })).toEqual({ fillStatus: 'OPEN', projectId: 'pa' });
  });
});
