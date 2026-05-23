import {
  BUDGET_APPROVAL_VARIANCE_THRESHOLD_KEY,
  BudgetApprovalAutoTriggerService,
} from '@src/modules/financial-governance/application/budget-approval-auto-trigger.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeApproval {
  id: string;
  projectBudgetId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedByPersonId: string;
  requestedAt: Date;
  requestedChange: unknown;
}

function buildStubs(seed: {
  approvals?: FakeApproval[];
  thresholdPct?: number | null;
}): {
  prisma: PrismaService;
  settings: PlatformSettingsService;
  approvals: FakeApproval[];
} {
  const approvals: FakeApproval[] = [...(seed.approvals ?? [])];
  let nextId = approvals.length + 1;

  const budgetApproval = {
    findFirst: async (q: {
      where: { projectBudgetId: string; status: string };
    }): Promise<FakeApproval | null> => {
      return (
        approvals.find(
          (a) => a.projectBudgetId === q.where.projectBudgetId && a.status === q.where.status,
        ) ?? null
      );
    },
    create: async (q: { data: Record<string, unknown> }): Promise<{ id: string }> => {
      const row: FakeApproval = {
        id: `appr-${nextId++}`,
        projectBudgetId: q.data.projectBudgetId as string,
        status: q.data.status as 'PENDING',
        requestedByPersonId: q.data.requestedByPersonId as string,
        requestedAt: q.data.requestedAt as Date,
        requestedChange: q.data.requestedChange,
      };
      approvals.push(row);
      return { id: row.id };
    },
  };

  const prisma = { budgetApproval } as unknown as PrismaService;

  const settings = {
    getRawValue: async (key: string): Promise<unknown> => {
      if (key === BUDGET_APPROVAL_VARIANCE_THRESHOLD_KEY) return seed.thresholdPct ?? null;
      return null;
    },
  } as unknown as PlatformSettingsService;

  return { prisma, settings, approvals };
}

describe('BudgetApprovalAutoTriggerService (S4-5)', () => {
  it('triggers INITIAL_BUDGET when prior total is 0 and new total > 0', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: 10 });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 0,
      priorOpex: 0,
      newCapex: 100_000,
      newOpex: 50_000,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('INITIAL_BUDGET');
    expect(approvals).toHaveLength(1);
    expect(approvals[0]!.requestedByPersonId).toBe('actor-1');
  });

  it('triggers REFORECAST_UP when variance ≥ threshold (default 10%)', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: 10 });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 100_000,
      priorOpex: 0,
      newCapex: 115_000,
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('REFORECAST_UP');
    expect(result.variancePct).toBeCloseTo(15, 1);
    expect(approvals).toHaveLength(1);
  });

  it('triggers REFORECAST_DOWN when negative variance crosses threshold', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: 10 });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 100_000,
      priorOpex: 0,
      newCapex: 80_000,
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe('REFORECAST_DOWN');
    expect(result.variancePct).toBeCloseTo(20, 1);
    expect(approvals).toHaveLength(1);
  });

  it('does NOT trigger when variance is below threshold', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: 10 });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 100_000,
      priorOpex: 0,
      newCapex: 105_000,
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(false);
    expect(result.variancePct).toBeCloseTo(5, 1);
    expect(approvals).toHaveLength(0);
  });

  it('is idempotent: returns existing PENDING approval instead of stacking duplicates', async () => {
    const existing: FakeApproval = {
      id: 'appr-existing',
      projectBudgetId: 'b1',
      status: 'PENDING',
      requestedByPersonId: 'actor-prior',
      requestedAt: new Date(),
      requestedChange: { source: 'manual' },
    };
    const { prisma, settings, approvals } = buildStubs({
      approvals: [existing],
      thresholdPct: 10,
    });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 100_000,
      priorOpex: 0,
      newCapex: 150_000,
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(false);
    expect(result.approvalId).toBe('appr-existing');
    expect(approvals).toHaveLength(1);
  });

  it('skips silently when no actor is available (no auto-trigger without requestor)', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: 10 });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 0,
      priorOpex: 0,
      newCapex: 100_000,
      newOpex: 0,
      actorId: undefined,
    });
    expect(result.triggered).toBe(false);
    expect(result.reason).toMatch(/no actor/);
    expect(approvals).toHaveLength(0);
  });

  it('no-ops when both prior and new total are 0', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: 10 });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 0,
      priorOpex: 0,
      newCapex: 0,
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(false);
    expect(result.reason).toMatch(/zero budget/);
    expect(approvals).toHaveLength(0);
  });

  it('honors a custom threshold from PlatformSetting', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: 25 });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    // 15% variance, 25% threshold → no trigger
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 100_000,
      priorOpex: 0,
      newCapex: 115_000,
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(false);
    expect(result.thresholdPct).toBe(25);
    expect(approvals).toHaveLength(0);
  });

  it('falls back to default 10% threshold when PlatformSetting value is missing or invalid', async () => {
    const { prisma, settings, approvals } = buildStubs({ thresholdPct: null });
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 100_000,
      priorOpex: 0,
      newCapex: 120_000, // 20% variance > default 10%
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(true);
    expect(result.thresholdPct).toBe(10);
    expect(approvals).toHaveLength(1);
  });

  it('never throws on internal error (swallows + returns triggered=false)', async () => {
    // Force budgetApproval.create to throw
    const prisma = {
      budgetApproval: {
        findFirst: async () => null,
        create: async () => {
          throw new Error('boom');
        },
      },
    } as unknown as PrismaService;
    const settings = {
      getRawValue: async () => 10,
    } as unknown as PlatformSettingsService;
    const svc = new BudgetApprovalAutoTriggerService(prisma, settings);
    const result = await svc.maybeTriggerForBudgetMutation({
      budgetId: 'b1',
      projectId: 'p1',
      fiscalYear: 2026,
      priorCapex: 0,
      priorOpex: 0,
      newCapex: 100_000,
      newOpex: 0,
      actorId: 'actor-1',
    });
    expect(result.triggered).toBe(false);
    expect(result.reason).toMatch(/auto-trigger error/);
  });
});
