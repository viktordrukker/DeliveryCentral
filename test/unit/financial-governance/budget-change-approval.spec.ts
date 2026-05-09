import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  ResponsibilityResolverService,
  ResponsibilityVerdict,
} from '@src/modules/identity-access/application/responsibility-resolver.service';
import { DecideBudgetChangeService } from '@src/modules/financial-governance/application/decide-budget-change.service';
import { RequestBudgetChangeService } from '@src/modules/financial-governance/application/request-budget-change.service';
import { FinancialRepository } from '@src/modules/financial-governance/infrastructure/financial.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

function stubResolver(verdict: ResponsibilityVerdict): ResponsibilityResolverService {
  return {
    resolve: async () => verdict,
  } as unknown as ResponsibilityResolverService;
}

function attachProjectStub(prisma: PrismaService): void {
  (prisma as unknown as Record<string, unknown>).project = {
    findUnique: async () => ({ clientId: null, projectType: null }),
  };
}

interface FakeBudget {
  id: string;
  projectId: string;
  fiscalYear: number;
  capexBudget: Prisma.Decimal;
  opexBudget: Prisma.Decimal;
}

interface FakeApproval {
  id: string;
  projectBudgetId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedByPersonId: string;
  decidedByPersonId: string | null;
  decisionAt: Date | null;
  decisionReason: string | null;
  requestedChange: { capexBudget: number; opexBudget: number } | null;
}

function buildFakeStack(initialBudget: FakeBudget): {
  prisma: PrismaService;
  repo: FinancialRepository;
  budgets: FakeBudget[];
  approvals: FakeApproval[];
} {
  const budgets: FakeBudget[] = [{ ...initialBudget }];
  const approvals: FakeApproval[] = [];

  const budgetApproval = {
    findFirst: async (args: {
      where: { projectBudgetId?: string; status?: string };
    }): Promise<FakeApproval | null> => {
      return (
        approvals.find(
          (a) =>
            (!args.where.projectBudgetId || a.projectBudgetId === args.where.projectBudgetId) &&
            (!args.where.status || a.status === args.where.status),
        ) ?? null
      );
    },
    findUnique: async (args: { where: { id: string } }): Promise<FakeApproval | null> =>
      approvals.find((a) => a.id === args.where.id) ?? null,
    create: async (args: { data: Partial<FakeApproval> }): Promise<{ id: string }> => {
      const row: FakeApproval = {
        id: `appr-${approvals.length + 1}`,
        projectBudgetId: args.data.projectBudgetId!,
        status: (args.data.status as FakeApproval['status']) ?? 'PENDING',
        requestedByPersonId: args.data.requestedByPersonId!,
        decidedByPersonId: (args.data.decidedByPersonId as string | null) ?? null,
        decisionAt: (args.data.decisionAt as Date | null) ?? null,
        decisionReason: (args.data.decisionReason as string | null) ?? null,
        requestedChange:
          (args.data.requestedChange as { capexBudget: number; opexBudget: number } | null) ?? null,
      };
      approvals.push(row);
      return { id: row.id };
    },
    update: async (args: {
      where: { id: string };
      data: Partial<FakeApproval>;
    }): Promise<FakeApproval> => {
      const row = approvals.find((a) => a.id === args.where.id);
      if (!row) throw new Error('approval not found');
      Object.assign(row, args.data);
      return row;
    },
  };

  const projectBudget = {
    findUnique: async (args: { where: { id: string } }): Promise<FakeBudget | null> =>
      budgets.find((b) => b.id === args.where.id) ?? null,
    update: async (args: {
      where: { id: string };
      data: { capexBudget: Prisma.Decimal; opexBudget: Prisma.Decimal };
    }): Promise<FakeBudget> => {
      const row = budgets.find((b) => b.id === args.where.id);
      if (!row) throw new Error('budget not found');
      row.capexBudget = args.data.capexBudget;
      row.opexBudget = args.data.opexBudget;
      return row;
    },
  };

  const prisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
      fn({ budgetApproval, projectBudget }),
    budgetApproval,
    projectBudget,
  };

  const repo = {
    findProjectBudget: async (projectId: string, fiscalYear: number): Promise<FakeBudget | null> =>
      budgets.find((b) => b.projectId === projectId && b.fiscalYear === fiscalYear) ?? null,
  } as unknown as FinancialRepository;

  return { prisma: prisma as unknown as PrismaService, repo, budgets, approvals };
}

const PROJECT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const FY = 2026;

describe('RequestBudgetChangeService', () => {
  it('writes a PENDING approval row without mutating the live budget', async () => {
    const { prisma, repo, budgets, approvals } = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    const service = new RequestBudgetChangeService(repo, prisma);

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: 150000,
      opexBudget: 75000,
      reason: 'Scope expansion',
    });

    expect(result.approvalId).toBeDefined();
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({
      status: 'PENDING',
      requestedByPersonId: 'pm-1',
      requestedChange: { capexBudget: 150000, opexBudget: 75000 },
      decisionReason: 'Scope expansion',
    });
    // Live budget MUST NOT have been mutated.
    expect(Number(budgets[0].capexBudget)).toBe(100000);
    expect(Number(budgets[0].opexBudget)).toBe(50000);
  });

  it('rejects a second pending request on the same budget', async () => {
    const { prisma, repo } = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    const service = new RequestBudgetChangeService(repo, prisma);

    await service.execute({
      actorId: 'pm-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: 150000,
      opexBudget: 75000,
    });
    await expect(
      service.execute({
        actorId: 'pm-2',
        projectId: PROJECT_ID,
        fiscalYear: FY,
        capexBudget: 200000,
        opexBudget: 80000,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects when the project budget does not exist', async () => {
    const { prisma, repo } = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    const service = new RequestBudgetChangeService(repo, prisma);

    await expect(
      service.execute({
        actorId: 'pm-1',
        projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        fiscalYear: FY,
        capexBudget: 150000,
        opexBudget: 75000,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects negative budget values', async () => {
    const { prisma, repo } = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    const service = new RequestBudgetChangeService(repo, prisma);

    await expect(
      service.execute({
        actorId: 'pm-1',
        projectId: PROJECT_ID,
        fiscalYear: FY,
        capexBudget: -1,
        opexBudget: 75000,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('DecideBudgetChangeService', () => {
  async function withPendingFixture(): Promise<{
    prisma: PrismaService;
    budgets: FakeBudget[];
    approvals: FakeApproval[];
    approvalId: string;
  }> {
    const stack = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    const result = await new RequestBudgetChangeService(stack.repo, stack.prisma).execute({
      actorId: 'pm-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: 150000,
      opexBudget: 75000,
    });
    return { ...stack, approvalId: result.approvalId };
  }

  it('approves: applies the change atomically and stamps the row APPROVED', async () => {
    const { prisma, budgets, approvals, approvalId } = await withPendingFixture();
    const service = new DecideBudgetChangeService(prisma);

    const result = await service.execute({
      actorId: 'director-1',
      approvalId,
      decision: 'APPROVE',
    });

    expect(result.decision).toBe('APPROVED');
    expect(result.budget.capexBudget).toBe(150000);
    expect(result.budget.opexBudget).toBe(75000);
    expect(Number(budgets[0].capexBudget)).toBe(150000);
    expect(Number(budgets[0].opexBudget)).toBe(75000);
    expect(approvals[0].status).toBe('APPROVED');
    expect(approvals[0].decidedByPersonId).toBe('director-1');
    expect(approvals[0].decisionAt).not.toBeNull();
  });

  it('rejects: leaves the live budget unchanged and stamps REJECTED with reason', async () => {
    const { prisma, budgets, approvals, approvalId } = await withPendingFixture();
    const service = new DecideBudgetChangeService(prisma);

    const result = await service.execute({
      actorId: 'director-1',
      approvalId,
      decision: 'REJECT',
      reason: 'Justification needed',
    });

    expect(result.decision).toBe('REJECTED');
    expect(Number(budgets[0].capexBudget)).toBe(100000);
    expect(Number(budgets[0].opexBudget)).toBe(50000);
    expect(approvals[0].status).toBe('REJECTED');
    expect(approvals[0].decisionReason).toBe('Justification needed');
  });

  it('forbids the requester from approving their own change (no rubber-stamp)', async () => {
    const { prisma, approvalId } = await withPendingFixture();
    const service = new DecideBudgetChangeService(prisma);

    await expect(
      service.execute({ actorId: 'pm-1', approvalId, decision: 'APPROVE' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires a reason on REJECT', async () => {
    const { prisma, approvalId } = await withPendingFixture();
    const service = new DecideBudgetChangeService(prisma);

    await expect(
      service.execute({ actorId: 'director-1', approvalId, decision: 'REJECT' }),
    ).rejects.toThrow(/reason is required/);
  });

  it('rejects a decision on an already-decided approval', async () => {
    const { prisma, approvalId } = await withPendingFixture();
    const service = new DecideBudgetChangeService(prisma);

    await service.execute({ actorId: 'director-1', approvalId, decision: 'APPROVE' });
    await expect(
      service.execute({ actorId: 'director-1', approvalId, decision: 'APPROVE' }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('RequestBudgetChangeService — ResponsibilityResolver integration (HD-4)', () => {
  it('SKIP verdict applies the change immediately and stamps APPROVED', async () => {
    const { prisma, repo, budgets, approvals } = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    attachProjectStub(prisma);
    const verdict: ResponsibilityVerdict = {
      mode: 'SKIP',
      targetRole: null,
      targetPersonId: null,
      ruleId: 'rule-skip',
      source: 'RULE',
      matchedScope: 'CLIENT',
    };
    const service = new RequestBudgetChangeService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: 150000,
      opexBudget: 75000,
    });

    expect(result.autoApproved).toBe(true);
    expect(result.responsibilityRuleId).toBe('rule-skip');
    expect(approvals[0].status).toBe('APPROVED');
    expect(approvals[0].decidedByPersonId).toBe('pm-1');
    expect(Number(budgets[0].capexBudget)).toBe(150000);
    expect(Number(budgets[0].opexBudget)).toBe(75000);
  });

  it('FALLBACK verdict keeps the PENDING flow exactly as before', async () => {
    const { prisma, repo, budgets, approvals } = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    attachProjectStub(prisma);
    const verdict: ResponsibilityVerdict = {
      mode: 'ROLE',
      targetRole: 'director',
      targetPersonId: null,
      ruleId: null,
      source: 'FALLBACK',
      matchedScope: null,
    };
    const service = new RequestBudgetChangeService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: 150000,
      opexBudget: 75000,
    });

    expect(result.autoApproved).toBe(false);
    expect(approvals[0].status).toBe('PENDING');
    expect(Number(budgets[0].capexBudget)).toBe(100000);
  });
});

describe('DecideBudgetChangeService — ResponsibilityResolver integration (HD-4)', () => {
  async function withPendingAndProjectStub(): Promise<{
    prisma: PrismaService;
    approvals: FakeApproval[];
    budgets: FakeBudget[];
    approvalId: string;
  }> {
    const stack = buildFakeStack({
      id: 'budget-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: new Prisma.Decimal(100000),
      opexBudget: new Prisma.Decimal(50000),
    });
    const result = await new RequestBudgetChangeService(stack.repo, stack.prisma).execute({
      actorId: 'pm-1',
      projectId: PROJECT_ID,
      fiscalYear: FY,
      capexBudget: 150000,
      opexBudget: 75000,
    });
    attachProjectStub(stack.prisma);
    return { ...stack, approvalId: result.approvalId };
  }

  it('PERSON verdict matching the actor allows the decision', async () => {
    const { prisma, approvals, approvalId } = await withPendingAndProjectStub();
    const verdict: ResponsibilityVerdict = {
      mode: 'PERSON',
      targetRole: null,
      targetPersonId: 'director-anna',
      ruleId: 'rule-person',
      source: 'RULE',
      matchedScope: 'PROJECT',
    };
    const service = new DecideBudgetChangeService(
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'director-anna',
      approvalId,
      decision: 'APPROVE',
    });

    expect(result.decision).toBe('APPROVED');
    expect(approvals[0].status).toBe('APPROVED');
    expect(approvals[0].decidedByPersonId).toBe('director-anna');
  });

  it('PERSON verdict mismatching the actor blocks with 403', async () => {
    const { prisma, approvalId } = await withPendingAndProjectStub();
    const verdict: ResponsibilityVerdict = {
      mode: 'PERSON',
      targetRole: null,
      targetPersonId: 'director-anna',
      ruleId: 'rule-person',
      source: 'RULE',
      matchedScope: 'PROJECT',
    };
    const service = new DecideBudgetChangeService(
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    await expect(
      service.execute({
        actorId: 'director-bob',
        approvalId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
