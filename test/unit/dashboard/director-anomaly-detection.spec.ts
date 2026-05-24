import { DirectorAnomalyDetectionService } from '@src/modules/dashboard/application/director-anomaly-detection.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

function emptyDelegate() {
  return { findMany: async (_q: unknown) => [] };
}

function buildStub(seed: {
  projects?: Array<{ id: string; name: string; status: string }>;
  ragSnapshots?: Record<string, Array<{ weekStarting: Date; overallRag: string }>>;
  budgetApprovals?: Array<{
    id: string;
    requestedAt: Date;
    projectBudget: { projectId: string; fiscalYear: number };
  }>;
  activations?: Array<{ id: string; projectId: string; requestedAt: Date }>;
  budgets?: Array<{
    id: string;
    projectId: string;
    fiscalYear: number;
    capexBudget: number;
    opexBudget: number;
    actualCost: number | null;
    updatedAt: Date;
  }>;
  milestones?: Array<{
    id: string;
    name: string;
    plannedDate: Date;
    projectId: string;
    progressPct: number;
    status: string;
    projectName: string;
  }>;
}): PrismaService {
  const project = {
    findMany: async (q: { where: { id?: { in: string[] }; status?: string } }): Promise<unknown[]> => {
      let rows = seed.projects ?? [];
      if (q.where.status) rows = rows.filter((p) => p.status === q.where.status);
      if (q.where.id?.in) rows = rows.filter((p) => q.where.id!.in.includes(p.id));
      return rows;
    },
  };
  const projectRagSnapshot = {
    findMany: async (q: { where: { projectId: string }; take: number }): Promise<unknown[]> => {
      const snaps = seed.ragSnapshots?.[q.where.projectId] ?? [];
      return [...snaps].sort((a, b) => b.weekStarting.getTime() - a.weekStarting.getTime()).slice(0, q.take);
    },
  };
  const budgetApproval = {
    findMany: async (_q: unknown): Promise<unknown[]> => seed.budgetApprovals ?? [],
  };
  const projectActivationApproval = {
    findMany: async (_q: unknown): Promise<unknown[]> => seed.activations ?? [],
  };
  const projectBudget = {
    findMany: async (_q: unknown): Promise<unknown[]> => seed.budgets ?? [],
  };
  const projectMilestone = {
    findMany: async (q: { where: { status: { in: string[] }; plannedDate: { lt: Date } } }): Promise<unknown[]> => {
      return (seed.milestones ?? [])
        .filter((m) => q.where.status.in.includes(m.status) && m.plannedDate < q.where.plannedDate.lt)
        .map((m) => ({
          id: m.id,
          name: m.name,
          plannedDate: m.plannedDate,
          projectId: m.projectId,
          progressPct: m.progressPct,
          project: { name: m.projectName },
        }));
    },
  };
  void emptyDelegate;
  return {
    project,
    projectRagSnapshot,
    budgetApproval,
    projectActivationApproval,
    projectBudget,
    projectMilestone,
  } as unknown as PrismaService;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('DirectorAnomalyDetectionService (FE-#265)', () => {
  it('returns empty when nothing fires', async () => {
    const svc = new DirectorAnomalyDetectionService(buildStub({ projects: [] }));
    expect(await svc.detect()).toEqual([]);
  });

  it('raises project_rag_dropped when latest snapshot dropped from GREEN to RED', async () => {
    const prisma = buildStub({
      projects: [{ id: 'pr1', name: 'Atlas', status: 'ACTIVE' }],
      ragSnapshots: {
        pr1: [
          { weekStarting: daysAgo(0), overallRag: 'RED' },
          { weekStarting: daysAgo(7), overallRag: 'GREEN' },
        ],
      },
    });
    const svc = new DirectorAnomalyDetectionService(prisma);
    const out = await svc.detect();
    const rag = out.find((a) => a.kind === 'project_rag_dropped');
    expect(rag).toBeDefined();
    expect(rag!.severity).toBe('critical'); // dropped TO RED
    expect(rag!.title).toContain('Atlas');
  });

  it('raises pending_approval_age for old budget approvals', async () => {
    const prisma = buildStub({
      budgetApprovals: [
        {
          id: 'ba1',
          requestedAt: daysAgo(20),
          projectBudget: { projectId: 'pr1', fiscalYear: 2026 },
        },
      ],
    });
    const svc = new DirectorAnomalyDetectionService(prisma);
    const out = await svc.detect();
    const aged = out.find((a) => a.kind === 'pending_approval_age');
    expect(aged).toBeDefined();
    expect(aged!.severity).toBe('danger'); // 20d ≥ 14
  });

  it('raises budget_overrun on ACTIVE project with >5% overrun', async () => {
    const prisma = buildStub({
      projects: [{ id: 'pr1', name: 'Atlas', status: 'ACTIVE' }],
      budgets: [
        {
          id: 'b1',
          projectId: 'pr1',
          fiscalYear: 2026,
          capexBudget: 50_000,
          opexBudget: 50_000,
          actualCost: 130_000, // 30% over
          updatedAt: new Date(),
        },
      ],
    });
    const svc = new DirectorAnomalyDetectionService(prisma);
    const out = await svc.detect();
    const o = out.find((a) => a.kind === 'budget_overrun');
    expect(o).toBeDefined();
    expect(o!.severity).toBe('critical'); // 30% ≥ 25%
    expect(o!.title).toContain('Atlas');
  });

  it('does NOT raise budget_overrun for inactive projects', async () => {
    const prisma = buildStub({
      projects: [{ id: 'pr1', name: 'Atlas', status: 'COMPLETED' }],
      budgets: [
        {
          id: 'b1',
          projectId: 'pr1',
          fiscalYear: 2026,
          capexBudget: 50_000,
          opexBudget: 50_000,
          actualCost: 200_000,
          updatedAt: new Date(),
        },
      ],
    });
    const svc = new DirectorAnomalyDetectionService(prisma);
    const out = await svc.detect();
    expect(out.find((a) => a.kind === 'budget_overrun')).toBeUndefined();
  });

  it('raises milestone_slip for late milestones, danger after 14d', async () => {
    const prisma = buildStub({
      milestones: [
        {
          id: 'm1',
          name: 'Cut-over',
          plannedDate: daysAgo(20),
          projectId: 'pr1',
          progressPct: 60,
          status: 'IN_PROGRESS',
          projectName: 'Atlas',
        },
      ],
    });
    const svc = new DirectorAnomalyDetectionService(prisma);
    const out = await svc.detect();
    const slip = out.find((a) => a.kind === 'milestone_slip');
    expect(slip).toBeDefined();
    expect(slip!.severity).toBe('danger');
    expect(slip!.title).toContain('Cut-over');
  });

  it('sorts by severity then decayRate, respects limit', async () => {
    const prisma = buildStub({
      milestones: [
        { id: 'm1', name: 'Old Critical', plannedDate: daysAgo(60), projectId: 'pr1', progressPct: 10, status: 'PLANNED', projectName: 'P1' },
        { id: 'm2', name: 'Recent Warn', plannedDate: daysAgo(3), projectId: 'pr2', progressPct: 90, status: 'IN_PROGRESS', projectName: 'P2' },
      ],
    });
    const svc = new DirectorAnomalyDetectionService(prisma);
    const out = await svc.detect({ limit: 1 });
    expect(out).toHaveLength(1);
    // critical (60d late) beats warning (3d late)
    expect(out[0]!.severity).toBe('critical');
  });
});
