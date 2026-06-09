/**
 * W2-07 — verifies ProjectDirectoryQueryService surfaces the new BE finance
 * fields (cpi / budgetStatus / openPositionsCount) on each ProjectDirectoryItem.
 *
 * Uses a hand-rolled PrismaService stub so the test stays in the fast `unit`
 * suite (no DB, no NestJS bootstrap). The repository ports come from the
 * existing demo-seeded in-memory implementations.
 */
import { Prisma } from '@prisma/client';

import { ProjectDirectoryQueryService } from '@src/modules/project-registry/application/project-directory-query.service';
import { createSeededInMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/create-seeded-in-memory-project.repository';
import { InMemoryProjectExternalLinkRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeBudget {
  projectId: string;
  fiscalYear: number;
  capexBudget: Prisma.Decimal;
  opexBudget: Prisma.Decimal;
  earnedValue: Prisma.Decimal | null;
  actualCost: Prisma.Decimal | null;
  eac: Prisma.Decimal | null;
}

interface FakeOpenPositionCount {
  projectId: string;
  count: number;
}

interface FakeAssignmentCount {
  projectId: string;
  count: number;
}

function buildPrismaStub(seed: {
  budgets?: FakeBudget[];
  openPositions?: FakeOpenPositionCount[];
  assignmentCounts?: FakeAssignmentCount[];
}): PrismaService {
  const projectBudget = {
    findMany: async (q: {
      where: { projectId: { in: string[] } };
      select: Record<string, true>;
      orderBy: unknown;
    }): Promise<FakeBudget[]> => {
      const requested = new Set(q.where.projectId.in);
      const rows = (seed.budgets ?? []).filter((b) => requested.has(b.projectId));
      // Match service's expected order: projectId asc, fiscalYear desc.
      rows.sort((a, b) =>
        a.projectId === b.projectId ? b.fiscalYear - a.fiscalYear : a.projectId.localeCompare(b.projectId),
      );
      return rows;
    },
  };
  const projectPosition = {
    // SoT PR 16a/1 — the service issues two distinct groupBy calls: one for
    // openPositionsCount (fillStatus = OPEN) and one for assignmentCount
    // (fillStatus ∈ active statuses). We discriminate via the `where.fillStatus`
    // shape.
    groupBy: async (q: {
      by: ['projectId'];
      where: { projectId: { in: string[] }; fillStatus: 'OPEN' | { in: string[] } };
      _count: { _all: true };
    }): Promise<Array<{ projectId: string; _count: { _all: number } }>> => {
      const requested = new Set(q.where.projectId.in);
      const isOpenGroup = q.where.fillStatus === 'OPEN';
      const source = isOpenGroup ? (seed.openPositions ?? []) : (seed.assignmentCounts ?? []);
      return source
        .filter((row) => requested.has(row.projectId))
        .map((row) => ({ projectId: row.projectId, _count: { _all: row.count } }));
    },
  };
  return { projectBudget, projectPosition } as unknown as PrismaService;
}

function buildService(prisma: PrismaService): ProjectDirectoryQueryService {
  return new ProjectDirectoryQueryService(
    createSeededInMemoryProjectRepository(),
    new InMemoryProjectExternalLinkRepository([]),
    prisma,
  );
}

describe('W2-07 — ProjectDirectoryQueryService finance fields', () => {
  const projectWithFullBudget = '33333333-3333-3333-3333-333333333003';
  const projectWithThinBudget = '33333333-3333-3333-3333-333333333001';

  it('computes CPI from latest-fiscal-year budget (EV / AC)', async () => {
    const prisma = buildPrismaStub({
      budgets: [
        {
          projectId: projectWithFullBudget,
          fiscalYear: 2025,
          capexBudget: new Prisma.Decimal(100_000),
          opexBudget: new Prisma.Decimal(50_000),
          earnedValue: new Prisma.Decimal(90_000),
          actualCost: new Prisma.Decimal(100_000),
          eac: new Prisma.Decimal(110_000),
        },
        // Older fiscal year should be ignored.
        {
          projectId: projectWithFullBudget,
          fiscalYear: 2024,
          capexBudget: new Prisma.Decimal(1),
          opexBudget: new Prisma.Decimal(1),
          earnedValue: new Prisma.Decimal(999_999),
          actualCost: new Prisma.Decimal(1),
          eac: new Prisma.Decimal(1),
        },
      ],
    });
    const result = await buildService(prisma).execute({});
    const row = result.items.find((p) => p.id === projectWithFullBudget);
    expect(row).toBeDefined();
    expect(row!.cpi).toBeCloseTo(0.9, 5);
  });

  it('returns null CPI when actualCost is zero or earnedValue is missing', async () => {
    const prisma = buildPrismaStub({
      budgets: [
        {
          projectId: projectWithFullBudget,
          fiscalYear: 2025,
          capexBudget: new Prisma.Decimal(100),
          opexBudget: new Prisma.Decimal(100),
          earnedValue: null,
          actualCost: new Prisma.Decimal(10),
          eac: null,
        },
        {
          projectId: projectWithThinBudget,
          fiscalYear: 2025,
          capexBudget: new Prisma.Decimal(100),
          opexBudget: new Prisma.Decimal(100),
          earnedValue: new Prisma.Decimal(50),
          actualCost: new Prisma.Decimal(0),
          eac: null,
        },
      ],
    });
    const result = await buildService(prisma).execute({});
    expect(result.items.find((p) => p.id === projectWithFullBudget)!.cpi).toBeNull();
    expect(result.items.find((p) => p.id === projectWithThinBudget)!.cpi).toBeNull();
  });

  it('maps budgetStatus to GREEN/YELLOW/RED/UNSET against the BAC thresholds', async () => {
    const prisma = buildPrismaStub({
      budgets: [
        // GREEN: EAC = 70 / BAC 100 → 70% → ≤ 85%
        {
          projectId: '33333333-3333-3333-3333-333333333001',
          fiscalYear: 2025,
          capexBudget: new Prisma.Decimal(60),
          opexBudget: new Prisma.Decimal(40),
          earnedValue: new Prisma.Decimal(50),
          actualCost: new Prisma.Decimal(50),
          eac: new Prisma.Decimal(70),
        },
        // YELLOW: EAC = 90 / BAC 100 → 90% → > 85% but ≤ 100%
        {
          projectId: '33333333-3333-3333-3333-333333333002',
          fiscalYear: 2025,
          capexBudget: new Prisma.Decimal(60),
          opexBudget: new Prisma.Decimal(40),
          earnedValue: new Prisma.Decimal(80),
          actualCost: new Prisma.Decimal(80),
          eac: new Prisma.Decimal(90),
        },
        // RED: EAC = 120 / BAC 100 → 120% → > 100%
        {
          projectId: '33333333-3333-3333-3333-333333333003',
          fiscalYear: 2025,
          capexBudget: new Prisma.Decimal(60),
          opexBudget: new Prisma.Decimal(40),
          earnedValue: new Prisma.Decimal(100),
          actualCost: new Prisma.Decimal(110),
          eac: new Prisma.Decimal(120),
        },
      ],
    });
    const result = await buildService(prisma).execute({});
    const byId = (id: string) => result.items.find((p) => p.id === id)!;
    expect(byId('33333333-3333-3333-3333-333333333001').budgetStatus).toBe('GREEN');
    expect(byId('33333333-3333-3333-3333-333333333002').budgetStatus).toBe('YELLOW');
    expect(byId('33333333-3333-3333-3333-333333333003').budgetStatus).toBe('RED');
    // Project with no budget row → UNSET.
    expect(byId('33333333-3333-3333-3333-333333333004').budgetStatus).toBe('UNSET');
    expect(byId('33333333-3333-3333-3333-333333333004').cpi).toBeNull();
  });

  it('aggregates openPositionsCount from groupBy(fillStatus=OPEN)', async () => {
    const prisma = buildPrismaStub({
      openPositions: [
        { projectId: '33333333-3333-3333-3333-333333333001', count: 3 },
        { projectId: '33333333-3333-3333-3333-333333333002', count: 0 }, // explicit zero
        { projectId: '33333333-3333-3333-3333-333333333003', count: 7 },
      ],
    });
    const result = await buildService(prisma).execute({});
    const byId = (id: string) => result.items.find((p) => p.id === id)!;
    expect(byId('33333333-3333-3333-3333-333333333001').openPositionsCount).toBe(3);
    // Project not in the openPositions list → 0.
    expect(byId('33333333-3333-3333-3333-333333333005').openPositionsCount).toBe(0);
    expect(byId('33333333-3333-3333-3333-333333333003').openPositionsCount).toBe(7);
  });

  it('defaults all finance fields when no PrismaService is wired (test compat)', async () => {
    const service = new ProjectDirectoryQueryService(
      createSeededInMemoryProjectRepository(),
      new InMemoryProjectExternalLinkRepository([]),
      // no prisma
    );
    const result = await service.execute({});
    for (const item of result.items) {
      expect(item.cpi).toBeNull();
      expect(item.budgetStatus).toBe('UNSET');
      expect(item.openPositionsCount).toBe(0);
    }
  });
});
