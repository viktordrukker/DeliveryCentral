import { Prisma } from '@prisma/client';

import { EvmComputationService } from '@src/modules/financial-governance/application/evm-computation.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeBudget {
  projectId: string;
  fiscalYear: number;
  capexBudget: Prisma.Decimal;
  opexBudget: Prisma.Decimal;
  earnedValue: Prisma.Decimal | null;
  actualCost: Prisma.Decimal | null;
  plannedToDate: Prisma.Decimal | null;
  eac: Prisma.Decimal | null;
  capexCorrectPct: Prisma.Decimal | null;
  version: number;
  updatedByPersonId: string | null;
}

interface FakeEntry {
  projectId: string;
  personId: string;
  date: Date;
  hours: number;
  capex: boolean;
  weekStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
}

interface FakeCostRate {
  personId: string;
  effectiveFrom: Date;
  hourlyRate: number;
}

interface FakeMilestone {
  projectId: string;
  plannedDate: Date;
  progressPct: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'HIT' | 'MISSED';
}

interface FakeProject {
  id: string;
}

function buildPrismaStub(seed: {
  budgets: FakeBudget[];
  entries: FakeEntry[];
  costRates: FakeCostRate[];
  milestones: FakeMilestone[];
  projects: FakeProject[];
}): { prisma: PrismaService; budgets: FakeBudget[] } {
  const budgets = [...seed.budgets];

  const projectBudget = {
    findUnique: async (q: {
      where: { projectId_fiscalYear: { projectId: string; fiscalYear: number } };
      select?: unknown;
    }): Promise<unknown | null> => {
      const row = budgets.find(
        (b) =>
          b.projectId === q.where.projectId_fiscalYear.projectId &&
          b.fiscalYear === q.where.projectId_fiscalYear.fiscalYear,
      );
      return row ?? null;
    },
    update: async (q: {
      where: { projectId_fiscalYear: { projectId: string; fiscalYear: number } };
      data: Record<string, unknown>;
    }): Promise<unknown> => {
      const row = budgets.find(
        (b) =>
          b.projectId === q.where.projectId_fiscalYear.projectId &&
          b.fiscalYear === q.where.projectId_fiscalYear.fiscalYear,
      );
      if (!row) throw new Error('budget not found');
      for (const [k, v] of Object.entries(q.data)) {
        if (k === 'version' && typeof v === 'object' && v !== null && 'increment' in v) {
          row.version += (v as { increment: number }).increment;
        } else if (k === 'updatedByPersonId') {
          row.updatedByPersonId = v as string | null;
        } else if (k in row) {
          // store EVM values as Decimal-like (Prisma stringifies on write); the
          // service hands us strings, mirror that.
          (row as unknown as Record<string, unknown>)[k] =
            v === null ? null : (v as string);
        }
      }
      return row;
    },
  };

  const timesheetEntry = {
    findMany: async (q: {
      where: {
        projectId: string;
        date: { gte: Date; lte: Date };
        timesheetWeek: { status: string };
      };
    }): Promise<unknown[]> => {
      return seed.entries
        .filter(
          (e) =>
            e.projectId === q.where.projectId &&
            e.weekStatus === q.where.timesheetWeek.status &&
            e.date >= q.where.date.gte &&
            e.date <= q.where.date.lte,
        )
        .map((e) => ({
          hours: e.hours,
          capex: e.capex,
          date: e.date,
          timesheetWeek: { personId: e.personId },
        }));
    },
  };

  const personCostRate = {
    findMany: async (q: {
      where: { personId: { in: string[] } };
    }): Promise<unknown[]> => {
      return seed.costRates
        .filter((r) => q.where.personId.in.includes(r.personId))
        .sort((a, b) => {
          if (a.personId !== b.personId) return a.personId.localeCompare(b.personId);
          return b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
        })
        .map((r) => ({
          personId: r.personId,
          effectiveFrom: r.effectiveFrom,
          hourlyRate: r.hourlyRate,
        }));
    },
  };

  const projectMilestone = {
    findMany: async (q: {
      where: { projectId: string; plannedDate: { gte: Date; lte: Date } };
    }): Promise<unknown[]> => {
      return seed.milestones
        .filter(
          (m) =>
            m.projectId === q.where.projectId &&
            m.plannedDate >= q.where.plannedDate.gte &&
            m.plannedDate <= q.where.plannedDate.lte,
        )
        .map((m) => ({
          progressPct: m.progressPct,
          plannedDate: m.plannedDate,
          status: m.status,
        }));
    },
  };

  const project = {
    findMany: async (): Promise<unknown[]> => seed.projects.map((p) => ({ id: p.id })),
  };

  const stub = { projectBudget, timesheetEntry, personCostRate, projectMilestone, project };
  return { prisma: stub as unknown as PrismaService, budgets };
}

const fy = 2026;
const FY_MID = new Date(Date.UTC(2026, 5, 1)); // 2026-06-01
const FY_LATE = new Date(Date.UTC(2026, 10, 1)); // 2026-11-01 — after "today" stub when today=2026-08
const RATE_BASE = new Date(Date.UTC(2025, 0, 1));

describe('EvmComputationService (S4-1)', () => {
  describe('computeSnapshot', () => {
    it('returns 0s + budgetExists=false when no budget row', async () => {
      const { prisma } = buildPrismaStub({
        budgets: [],
        entries: [],
        costRates: [],
        milestones: [],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      const snap = await svc.computeSnapshot('proj-1', fy);
      expect(snap.budgetExists).toBe(false);
      expect(snap.bac).toBe(0);
      expect(snap.actualCost).toBe(0);
      expect(snap.earnedValue).toBe(0);
      expect(snap.eac).toBe(0);
      expect(snap.capexCorrectPct).toBeNull();
    });

    it('AC = Σ hours × effective hourly rate (latest rate ≤ entry date)', async () => {
      const { prisma } = buildPrismaStub({
        budgets: [makeBudget('proj-1', fy, 100000, 0)],
        entries: [
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 8, capex: false, weekStatus: 'APPROVED' },
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 2, capex: true, weekStatus: 'APPROVED' },
        ],
        costRates: [{ personId: 'p1', effectiveFrom: RATE_BASE, hourlyRate: 50 }],
        milestones: [],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      const snap = await svc.computeSnapshot('proj-1', fy);
      expect(snap.totalHours).toBe(10);
      expect(snap.capexHours).toBe(2);
      expect(snap.actualCost).toBe(500); // 10h × $50
      expect(snap.capexCorrectPct).toBe(0.2); // 2/10
    });

    it('AC skips DRAFT/SUBMITTED weeks (only APPROVED counted)', async () => {
      const { prisma } = buildPrismaStub({
        budgets: [makeBudget('proj-1', fy, 1000, 0)],
        entries: [
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 5, capex: false, weekStatus: 'DRAFT' },
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 5, capex: false, weekStatus: 'SUBMITTED' },
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 5, capex: false, weekStatus: 'APPROVED' },
        ],
        costRates: [{ personId: 'p1', effectiveFrom: RATE_BASE, hourlyRate: 40 }],
        milestones: [],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      const snap = await svc.computeSnapshot('proj-1', fy);
      expect(snap.totalHours).toBe(5);
      expect(snap.actualCost).toBe(200); // 5 × 40
    });

    it('uses the most-recent rate effective on or before entry.date', async () => {
      const { prisma } = buildPrismaStub({
        budgets: [makeBudget('proj-1', fy, 1000, 0)],
        entries: [
          // entry on 2026-06-01; rate 30 from 2025-01-01, rate 50 from 2026-03-01
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 10, capex: false, weekStatus: 'APPROVED' },
        ],
        costRates: [
          { personId: 'p1', effectiveFrom: RATE_BASE, hourlyRate: 30 },
          { personId: 'p1', effectiveFrom: new Date(Date.UTC(2026, 2, 1)), hourlyRate: 50 },
        ],
        milestones: [],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      const snap = await svc.computeSnapshot('proj-1', fy);
      expect(snap.actualCost).toBe(500); // 10 × 50 (later rate wins)
    });

    it('EV = Σ weight × progressPct × BAC; equal weighting across milestones', async () => {
      const { prisma } = buildPrismaStub({
        budgets: [makeBudget('proj-1', fy, 100000, 50000)],
        entries: [],
        costRates: [],
        milestones: [
          { projectId: 'proj-1', plannedDate: FY_MID, progressPct: 100, status: 'HIT' },
          { projectId: 'proj-1', plannedDate: FY_MID, progressPct: 50, status: 'IN_PROGRESS' },
          { projectId: 'proj-1', plannedDate: FY_LATE, progressPct: 0, status: 'PLANNED' },
        ],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      const snap = await svc.computeSnapshot('proj-1', fy);
      // BAC = 150000; weight = 1/3 = 0.3333…
      // EV = (1/3)*1.0*150000 + (1/3)*0.5*150000 + (1/3)*0*150000 = 50000 + 25000 = 75000
      expect(snap.earnedValue).toBeCloseTo(75000, 1);
    });

    it('PV counts only milestones whose plannedDate is ≤ today', async () => {
      const today = new Date();
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const todayFy = today.getUTCFullYear();
      const { prisma } = buildPrismaStub({
        budgets: [makeBudget('proj-1', todayFy, 100000, 0)],
        entries: [],
        costRates: [],
        milestones: [
          { projectId: 'proj-1', plannedDate: past, progressPct: 100, status: 'HIT' },
          { projectId: 'proj-1', plannedDate: future, progressPct: 0, status: 'PLANNED' },
        ],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      const snap = await svc.computeSnapshot('proj-1', todayFy);
      // 2 milestones; weight 0.5; only the past one counts → PV = 0.5 × 100000 = 50000
      expect(snap.plannedValue).toBe(50000);
    });

    it('EAC = BAC × (AC / EV); falls back to AC when EV = 0', async () => {
      const { prisma: p1 } = buildPrismaStub({
        budgets: [makeBudget('proj-1', fy, 100000, 0)],
        entries: [
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 100, capex: false, weekStatus: 'APPROVED' },
        ],
        costRates: [{ personId: 'p1', effectiveFrom: RATE_BASE, hourlyRate: 100 }],
        milestones: [
          { projectId: 'proj-1', plannedDate: FY_MID, progressPct: 50, status: 'IN_PROGRESS' },
        ],
        projects: [],
      });
      const svc1 = new EvmComputationService(p1);
      const snap1 = await svc1.computeSnapshot('proj-1', fy);
      // BAC=100000, AC=10000, EV = 1.0 × 0.5 × 100000 = 50000 → EAC = 100000×(10000/50000)=20000
      expect(snap1.eac).toBe(20000);

      const { prisma: p2 } = buildPrismaStub({
        budgets: [makeBudget('proj-2', fy, 100000, 0)],
        entries: [
          { projectId: 'proj-2', personId: 'p1', date: FY_MID, hours: 100, capex: false, weekStatus: 'APPROVED' },
        ],
        costRates: [{ personId: 'p1', effectiveFrom: RATE_BASE, hourlyRate: 100 }],
        milestones: [],
        projects: [],
      });
      const svc2 = new EvmComputationService(p2);
      const snap2 = await svc2.computeSnapshot('proj-2', fy);
      // EV = 0 → EAC = AC = 10000
      expect(snap2.eac).toBe(10000);
    });
  });

  describe('recomputeForProject', () => {
    it('persists EVM columns + bumps version + sets updatedByPersonId when budget exists', async () => {
      const { prisma, budgets } = buildPrismaStub({
        budgets: [makeBudget('proj-1', fy, 100000, 0)],
        entries: [
          { projectId: 'proj-1', personId: 'p1', date: FY_MID, hours: 10, capex: true, weekStatus: 'APPROVED' },
        ],
        costRates: [{ personId: 'p1', effectiveFrom: RATE_BASE, hourlyRate: 50 }],
        milestones: [
          { projectId: 'proj-1', plannedDate: FY_MID, progressPct: 100, status: 'HIT' },
        ],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      await svc.recomputeForProject('proj-1', fy, 'actor-1');
      const row = budgets[0]!;
      expect(row.actualCost).toBe('500');
      expect(row.earnedValue).toBe('100000');
      // EAC = BAC × (AC/EV) = 100000 × (500/100000) = 500
      expect(row.eac).toBe('500');
      expect(row.capexCorrectPct).toBe('1');
      expect(row.updatedByPersonId).toBe('actor-1');
      expect(row.version).toBe(2);
    });

    it('skips persistence + returns snapshot when no ProjectBudget row exists', async () => {
      const { prisma, budgets } = buildPrismaStub({
        budgets: [],
        entries: [],
        costRates: [],
        milestones: [],
        projects: [],
      });
      const svc = new EvmComputationService(prisma);
      const snap = await svc.recomputeForProject('proj-x', fy, 'actor-1');
      expect(snap.budgetExists).toBe(false);
      expect(budgets).toHaveLength(0);
    });
  });

  describe('recomputeAllProjects', () => {
    it('aggregates persisted vs skippedNoBudget vs failures', async () => {
      const { prisma } = buildPrismaStub({
        budgets: [
          makeBudget('proj-1', fy, 1000, 0),
          makeBudget('proj-2', fy, 1000, 0),
        ],
        entries: [],
        costRates: [],
        milestones: [],
        projects: [{ id: 'proj-1' }, { id: 'proj-2' }, { id: 'proj-3' }],
      });
      const svc = new EvmComputationService(prisma);
      const summary = await svc.recomputeAllProjects('actor-1', fy);
      expect(summary.projectsProcessed).toBe(3);
      expect(summary.persisted).toBe(2);
      expect(summary.skippedNoBudget).toBe(1);
      expect(summary.failures).toBe(0);
    });
  });
});

function makeBudget(
  projectId: string,
  fiscalYear: number,
  capex: number,
  opex: number,
): FakeBudget {
  return {
    projectId,
    fiscalYear,
    capexBudget: new Prisma.Decimal(capex),
    opexBudget: new Prisma.Decimal(opex),
    earnedValue: null,
    actualCost: null,
    plannedToDate: null,
    eac: null,
    capexCorrectPct: null,
    version: 1,
    updatedByPersonId: null,
  };
}
