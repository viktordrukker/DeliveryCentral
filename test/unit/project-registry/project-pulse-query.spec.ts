import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ProjectPulseQueryService } from '@src/modules/project-registry/application/project-pulse-query.service';
import { RadiatorScoringService } from '@src/modules/project-registry/application/radiator-scoring.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeProject {
  id: string;
}

interface FakePosition {
  projectId: string;
  fillStatus:
    | 'DRAFT'
    | 'OPEN'
    | 'PROPOSED'
    | 'BOOKED'
    | 'ONBOARDING'
    | 'ASSIGNED'
    | 'ON_HOLD'
    | 'RELEASED';
}

interface FakeBudget {
  projectId: string;
  fiscalYear: number;
  capexBudget: Prisma.Decimal;
  opexBudget: Prisma.Decimal;
  actualCost: Prisma.Decimal | null;
  earnedValue: Prisma.Decimal | null;
  plannedToDate: Prisma.Decimal | null;
  eac: Prisma.Decimal | null;
}

interface FakeMilestone {
  id: string;
  projectId: string;
  name: string;
  plannedDate: Date;
  status: 'PLANNED' | 'IN_PROGRESS' | 'HIT' | 'MISSED';
  progressPct: number;
}

interface FakeRisk {
  id: string;
  projectId: string;
  title: string;
  category: string;
  probability: number;
  impact: number;
  status: 'IDENTIFIED' | 'ASSESSED' | 'MITIGATING' | 'RESOLVED' | 'CLOSED';
  ownerPersonId: string | null;
}

interface FakeActivationApproval {
  id: string;
  projectId: string;
  requestedAt: Date;
  decision: string | null;
}

interface FakeBudgetApproval {
  id: string;
  projectBudgetProjectId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: Date;
}

interface FakeChangeRequest {
  id: string;
  projectId: string;
  title: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: Date;
}

function buildPrismaStub(seed: {
  projects?: FakeProject[];
  positions?: FakePosition[];
  budgets?: FakeBudget[];
  milestones?: FakeMilestone[];
  risks?: FakeRisk[];
  activations?: FakeActivationApproval[];
  budgetApprovals?: FakeBudgetApproval[];
  changeRequests?: FakeChangeRequest[];
}): PrismaService {
  const project = {
    findUnique: async (q: { where: { id: string } }): Promise<FakeProject | null> =>
      (seed.projects ?? []).find((p) => p.id === q.where.id) ?? null,
  };
  const projectPosition = {
    groupBy: async (q: {
      by: ['fillStatus'];
      where: { projectId: string };
    }): Promise<Array<{ fillStatus: string; _count: { _all: number } }>> => {
      const grouped = new Map<string, number>();
      for (const p of seed.positions ?? []) {
        if (p.projectId !== q.where.projectId) continue;
        grouped.set(p.fillStatus, (grouped.get(p.fillStatus) ?? 0) + 1);
      }
      return [...grouped.entries()].map(([fillStatus, n]) => ({
        fillStatus,
        _count: { _all: n },
      }));
    },
  };
  const projectBudget = {
    findFirst: async (q: { where: { projectId: string } }): Promise<FakeBudget | null> => {
      const rows = (seed.budgets ?? [])
        .filter((b) => b.projectId === q.where.projectId)
        .sort((a, b) => b.fiscalYear - a.fiscalYear);
      return rows[0] ?? null;
    },
  };
  const projectMilestone = {
    findFirst: async (q: {
      where: { projectId: string; status: { in: string[] } };
    }): Promise<FakeMilestone | null> => {
      const rows = (seed.milestones ?? [])
        .filter(
          (m) =>
            m.projectId === q.where.projectId && q.where.status.in.includes(m.status),
        )
        .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime());
      return rows[0] ?? null;
    },
  };
  const projectRisk = {
    findMany: async (q: {
      where: { projectId: string; status: { in: string[] } };
      take: number;
    }): Promise<FakeRisk[]> => {
      return (seed.risks ?? [])
        .filter(
          (r) => r.projectId === q.where.projectId && q.where.status.in.includes(r.status),
        )
        .slice(0, q.take);
    },
  };
  const projectActivationApproval = {
    findMany: async (q: {
      where: { projectId: string; decision: null };
      take?: number;
    }): Promise<FakeActivationApproval[]> => {
      const rows = (seed.activations ?? [])
        .filter((a) => a.projectId === q.where.projectId && a.decision === null)
        .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
      return rows.slice(0, q.take ?? 5);
    },
  };
  const budgetApproval = {
    findMany: async (q: {
      where: { projectBudget: { projectId: string }; status: string };
      take?: number;
    }): Promise<FakeBudgetApproval[]> => {
      const rows = (seed.budgetApprovals ?? [])
        .filter(
          (a) =>
            a.projectBudgetProjectId === q.where.projectBudget.projectId &&
            a.status === q.where.status,
        )
        .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
      return rows.slice(0, q.take ?? 5);
    },
  };
  const projectChangeRequest = {
    findMany: async (q: {
      where: { projectId: string; status: string };
      take?: number;
    }): Promise<FakeChangeRequest[]> => {
      const rows = (seed.changeRequests ?? [])
        .filter((c) => c.projectId === q.where.projectId && c.status === q.where.status)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows.slice(0, q.take ?? 5);
    },
  };

  // FE-#259 additive aggregator dependencies — return empty arrays / zeros
  // so tests that don't seed these surfaces still pass.
  const projectPositionExt = {
    ...projectPosition,
    findMany: async (_q: unknown): Promise<unknown[]> => [],
    count: async (_q: unknown): Promise<number> => 0,
  };
  const projectMilestoneExt = {
    ...projectMilestone,
    findMany: async (q: { where: { projectId: string } }): Promise<unknown[]> => {
      return (seed.milestones ?? [])
        .filter((m) => m.projectId === q.where.projectId)
        .map((m) => ({ status: m.status, plannedDate: m.plannedDate }));
    },
  };
  const projectPositionFillHistory = {
    count: async (_q: unknown): Promise<number> => 0,
  };
  const projectExternalLink = {
    findMany: async (_q: unknown): Promise<unknown[]> => [],
  };
  const auditLog = {
    findMany: async (_q: unknown): Promise<unknown[]> => [],
  };

  return {
    project,
    projectPosition: projectPositionExt,
    projectBudget,
    projectMilestone: projectMilestoneExt,
    projectRisk,
    projectActivationApproval,
    budgetApproval,
    projectChangeRequest,
    projectPositionFillHistory,
    projectExternalLink,
    auditLog,
  } as unknown as PrismaService;
}

function fakeRadiator(score = 75, band: 'GREEN' | 'AMBER' | 'RED' | 'CRITICAL' = 'GREEN') {
  return {
    computeRadiator: async (_projectId: string) => ({
      overallScore: score,
      overallBand: band,
      quadrants: [
        { key: 'scope', score: 20, band: 'GREEN' },
        { key: 'schedule', score: 18, band: 'GREEN' },
        { key: 'budget', score: 17, band: 'AMBER' },
        { key: 'people', score: 20, band: 'GREEN' },
      ],
    }),
  } as unknown as RadiatorScoringService;
}

describe('ProjectPulseQueryService (S3-1)', () => {
  it('throws NotFoundException when project does not exist', async () => {
    const prisma = buildPrismaStub({ projects: [] });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    await expect(svc.getPulseSnapshot('missing')).rejects.toThrow(NotFoundException);
  });

  it('aggregates positions by fillStatus bucket (open / proposed / active / totalNonReleased)', async () => {
    const prisma = buildPrismaStub({
      projects: [{ id: 'p1' }],
      positions: [
        { projectId: 'p1', fillStatus: 'OPEN' },
        { projectId: 'p1', fillStatus: 'OPEN' },
        { projectId: 'p1', fillStatus: 'PROPOSED' },
        { projectId: 'p1', fillStatus: 'BOOKED' },
        { projectId: 'p1', fillStatus: 'ONBOARDING' },
        { projectId: 'p1', fillStatus: 'ASSIGNED' },
        { projectId: 'p1', fillStatus: 'ASSIGNED' },
        { projectId: 'p1', fillStatus: 'RELEASED' },
        { projectId: 'p1', fillStatus: 'ON_HOLD' },
      ],
    });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.positions.open).toBe(2);
    expect(snap.positions.proposed).toBe(1);
    expect(snap.positions.active).toBe(4); // 1 BOOKED + 1 ONBOARDING + 2 ASSIGNED
    expect(snap.positions.totalNonReleased).toBe(8); // 9 total, minus 1 RELEASED
  });

  it('computes budget variancePct = (AC − PTD) / PTD * 100 (2dp)', async () => {
    const prisma = buildPrismaStub({
      projects: [{ id: 'p1' }],
      budgets: [
        {
          projectId: 'p1',
          fiscalYear: 2026,
          capexBudget: new Prisma.Decimal(60_000),
          opexBudget: new Prisma.Decimal(40_000),
          actualCost: new Prisma.Decimal(55_000),
          earnedValue: new Prisma.Decimal(50_000),
          plannedToDate: new Prisma.Decimal(50_000),
          eac: new Prisma.Decimal(110_000),
        },
      ],
    });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.budget.bac).toBe(100_000);
    expect(snap.budget.variancePct).toBe(10); // (55000-50000)/50000 = 10%
  });

  it('variancePct is null when PTD is null or zero', async () => {
    const prisma = buildPrismaStub({
      projects: [{ id: 'p1' }],
      budgets: [
        {
          projectId: 'p1',
          fiscalYear: 2026,
          capexBudget: new Prisma.Decimal(50_000),
          opexBudget: new Prisma.Decimal(0),
          actualCost: new Prisma.Decimal(10_000),
          earnedValue: null,
          plannedToDate: null,
          eac: null,
        },
      ],
    });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.budget.variancePct).toBeNull();
  });

  it('returns nulls for budget block when no ProjectBudget row exists', async () => {
    const prisma = buildPrismaStub({ projects: [{ id: 'p1' }], budgets: [] });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.budget).toEqual({
      fiscalYear: null,
      bac: null,
      actualCost: null,
      earnedValue: null,
      plannedToDate: null,
      eac: null,
      variancePct: null,
    });
  });

  it('picks the earliest non-terminal milestone as nextMilestone', async () => {
    const prisma = buildPrismaStub({
      projects: [{ id: 'p1' }],
      milestones: [
        {
          id: 'm1',
          projectId: 'p1',
          name: 'M1',
          plannedDate: new Date('2026-09-01'),
          status: 'IN_PROGRESS',
          progressPct: 40,
        },
        {
          id: 'm2',
          projectId: 'p1',
          name: 'M2',
          plannedDate: new Date('2026-07-01'),
          status: 'PLANNED',
          progressPct: 0,
        },
        {
          id: 'm3',
          projectId: 'p1',
          name: 'M3',
          plannedDate: new Date('2026-06-01'),
          status: 'HIT',
          progressPct: 100,
        },
      ],
    });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.nextMilestone?.id).toBe('m2');
    expect(snap.nextMilestone?.plannedDate).toBe('2026-07-01');
  });

  it('returns top 3 risks scored by probability * impact descending', async () => {
    const prisma = buildPrismaStub({
      projects: [{ id: 'p1' }],
      risks: [
        { id: 'r1', projectId: 'p1', title: 'low', category: 'OPS', probability: 1, impact: 2, status: 'IDENTIFIED', ownerPersonId: null },
        { id: 'r2', projectId: 'p1', title: 'high', category: 'TECH', probability: 5, impact: 5, status: 'MITIGATING', ownerPersonId: null },
        { id: 'r3', projectId: 'p1', title: 'med', category: 'PEOPLE', probability: 3, impact: 4, status: 'ASSESSED', ownerPersonId: null },
        { id: 'r4', projectId: 'p1', title: 'closed', category: 'OPS', probability: 5, impact: 5, status: 'CLOSED', ownerPersonId: null },
        { id: 'r5', projectId: 'p1', title: 'high2', category: 'OPS', probability: 4, impact: 4, status: 'IDENTIFIED', ownerPersonId: null },
      ],
    });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.topRisks.map((r) => r.id)).toEqual(['r2', 'r5', 'r3']);
    expect(snap.topRisks[0]!.score).toBe(25);
    // CLOSED risk filtered out
    expect(snap.topRisks.find((r) => r.id === 'r4')).toBeUndefined();
  });

  it('next decision picks the most recent pending across activation / budget / change', async () => {
    const prisma = buildPrismaStub({
      projects: [{ id: 'p1' }],
      activations: [
        { id: 'a1', projectId: 'p1', requestedAt: new Date('2026-04-01'), decision: null },
      ],
      budgetApprovals: [
        { id: 'b1', projectBudgetProjectId: 'p1', status: 'PENDING', requestedAt: new Date('2026-05-01') },
      ],
      changeRequests: [
        { id: 'c1', projectId: 'p1', title: 'Add scope', status: 'PROPOSED', createdAt: new Date('2026-03-01') },
      ],
    });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.nextDecision?.kind).toBe('budget_approval'); // most recent (2026-05-01)
    expect(snap.nextDecision?.id).toBe('b1');
  });

  it('nextDecision is null when no pending approvals or change requests exist', async () => {
    const prisma = buildPrismaStub({ projects: [{ id: 'p1' }] });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator());
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.nextDecision).toBeNull();
  });

  it('forwards radiator overallScore + overallBand + quadrant shape', async () => {
    const prisma = buildPrismaStub({ projects: [{ id: 'p1' }] });
    const svc = new ProjectPulseQueryService(prisma, fakeRadiator(62, 'AMBER'));
    const snap = await svc.getPulseSnapshot('p1');
    expect(snap.overallScore).toBe(62);
    expect(snap.overallBand).toBe('AMBER');
    expect(snap.quadrants).toHaveLength(4);
    expect(snap.quadrants.map((q) => q.key).sort()).toEqual(['budget', 'people', 'schedule', 'scope']);
  });
});
