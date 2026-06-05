import { SidebarCountsService } from '@src/modules/dashboard/application/sidebar-counts.service';
import {
  ACTIVE_FILL_STATUSES,
  canonicalActivePersonWhere,
  countBench,
  listBenchPersonIds,
} from '@src/shared/persistence/bench-query';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakePerson {
  id: string;
}

interface FakeFillRow {
  activePersonId: string;
}

function buildPrismaStub(args: {
  activePeople: FakePerson[];
  filledPersonIds: string[];
}): PrismaService {
  const project = { count: async () => 0 };
  const budgetApproval = { count: async () => 0 };
  const projectActivationApproval = { count: async () => 0 };
  const leaveRequest = { count: async () => 0 };
  const caseRecord = { count: async () => 0 };
  const personSkill = { count: async () => 0 };
  const projectPosition = {
    count: async () => 0,
    groupBy: async (): Promise<FakeFillRow[]> =>
      args.filledPersonIds.map((id) => ({ activePersonId: id })),
  };
  const person = {
    findMany: async (_q: unknown) => args.activePeople,
    count: async () => args.activePeople.length,
  };
  return {
    project,
    budgetApproval,
    projectActivationApproval,
    leaveRequest,
    caseRecord,
    personSkill,
    projectPosition,
    person,
  } as unknown as PrismaService;
}

describe('bench-query canonical helper', () => {
  it('exports the canonical fill-status whitelist', () => {
    expect(ACTIVE_FILL_STATUSES).toEqual(['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD']);
  });

  it('canonicalActivePersonWhere applies the four required predicates', () => {
    expect(canonicalActivePersonWhere()).toEqual({
      deletedAt: null,
      archivedAt: null,
      terminatedAt: null,
      employmentStatus: 'ACTIVE',
    });
  });

  it('listBenchPersonIds returns active people who hold no active fill', async () => {
    const prisma = buildPrismaStub({
      activePeople: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      filledPersonIds: ['p2', 'p3'],
    });
    const bench = await listBenchPersonIds(prisma);
    expect([...bench].sort()).toEqual(['p1', 'p4']);
  });

  it('countBench equals listBenchPersonIds.size', async () => {
    const prisma = buildPrismaStub({
      activePeople: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      filledPersonIds: ['p2'],
    });
    const count = await countBench(prisma);
    const set = await listBenchPersonIds(prisma);
    expect(count).toBe(set.size);
    expect(count).toBe(3);
  });

  it('all surfaces reconcile to the same bench count for the same data', async () => {
    const prisma = buildPrismaStub({
      activePeople: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }],
      filledPersonIds: ['p1', 'p2'], // p3, p4, p5 on bench
    });

    const canonical = await countBench(prisma);

    const sidebar = new SidebarCountsService(prisma);
    const sidebarOut = await sidebar.getCounts(['admin']);

    expect(canonical).toBe(3);
    expect(sidebarOut.bench).toBe(canonical);
  });

  it('canonical count excludes the soft-deleted / archived / terminated cohort by definition', async () => {
    // The fake stub already restricts `activePeople` to the four-predicate
    // result set; this test documents the contract — only the rows that
    // satisfy `canonicalActivePersonWhere` should ever flow into the count.
    const where = canonicalActivePersonWhere();
    expect(where.deletedAt).toBeNull();
    expect(where.archivedAt).toBeNull();
    expect(where.terminatedAt).toBeNull();
    expect(where.employmentStatus).toBe('ACTIVE');
  });
});
