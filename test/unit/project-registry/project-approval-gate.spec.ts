import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  ResponsibilityResolverService,
  ResponsibilityVerdict,
} from '@src/modules/identity-access/application/responsibility-resolver.service';
import { Project } from '@src/modules/project-registry/domain/entities/project.entity';
import { ProjectId } from '@src/modules/project-registry/domain/value-objects/project-id';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { SubmitProjectForApprovalService } from '@src/modules/project-registry/application/submit-project-for-approval.service';
import { DecideProjectActivationService } from '@src/modules/project-registry/application/decide-project-activation.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

function stubResolver(verdict: ResponsibilityVerdict): ResponsibilityResolverService {
  return {
    resolve: async () => verdict,
  } as unknown as ResponsibilityResolverService;
}

const FALLBACK: ResponsibilityVerdict = {
  mode: 'ROLE',
  targetRole: 'director',
  targetPersonId: null,
  ruleId: null,
  source: 'FALLBACK',
  matchedScope: null,
};

interface ApprovalRow {
  id: string;
  projectId: string;
  requestedById: string;
  decidedAt: Date | null;
  decidedById: string | null;
  decision: 'APPROVED' | 'REJECTED' | null;
  reason: string | null;
  requestedAt: Date;
}

/**
 * Build a stub PrismaService that:
 *   - tracks `projectActivationApproval` rows in-memory,
 *   - executes `$transaction` closures with a tx client whose
 *     `projectActivationApproval` is the same in-memory store,
 *   - exposes `findFirst` / `update` for `DecideProjectActivationService`.
 */
function buildPrismaStub(): { prisma: PrismaService; rows: ApprovalRow[] } {
  const rows: ApprovalRow[] = [];
  const projectActivationApproval = {
    create: async (args: { data: Partial<ApprovalRow> }): Promise<{ id: string }> => {
      const row: ApprovalRow = {
        id: `approval-${rows.length + 1}`,
        projectId: args.data.projectId!,
        requestedById: args.data.requestedById!,
        decidedAt: (args.data.decidedAt as Date | null) ?? null,
        decidedById: (args.data.decidedById as string | null) ?? null,
        decision: (args.data.decision as ApprovalRow['decision']) ?? null,
        reason: args.data.reason ?? null,
        requestedAt: new Date(),
      };
      rows.push(row);
      return { id: row.id };
    },
    findFirst: async (args: {
      where: { projectId: string; decidedAt: null };
      orderBy?: unknown;
    }): Promise<ApprovalRow | null> => {
      const matches = rows
        .filter((r) => r.projectId === args.where.projectId && r.decidedAt === null)
        .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
      return matches[0] ?? null;
    },
    update: async (args: {
      where: { id: string };
      data: Partial<ApprovalRow>;
    }): Promise<ApprovalRow> => {
      const row = rows.find((r) => r.id === args.where.id);
      if (!row) throw new Error(`row ${args.where.id} not found`);
      Object.assign(row, args.data);
      return row;
    },
  };
  const prisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({ projectActivationApproval }),
    projectActivationApproval,
  };
  return { prisma: prisma as unknown as PrismaService, rows };
}

function buildDraftProject(): { repo: InMemoryProjectRepository; project: Project } {
  const project = Project.create(
    { name: 'Apollo', projectCode: 'IT-PROJ-9001', status: 'DRAFT' },
    ProjectId.from('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  );
  const repo = new InMemoryProjectRepository([project]);
  return { repo, project };
}

describe('SubmitProjectForApprovalService', () => {
  it('transitions DRAFT → PENDING_APPROVAL and writes an approval row', async () => {
    const { prisma, rows } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    const service = new SubmitProjectForApprovalService(repo, prisma);

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
      reason: 'Ready for activation',
    });

    expect(result.project.status).toBe('PENDING_APPROVAL');
    expect(result.approvalId).toBeDefined();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      projectId: project.projectId.value,
      requestedById: 'pm-1',
      reason: 'Ready for activation',
      decidedAt: null,
    });
  });

  it('rejects submission when status is not DRAFT', async () => {
    const { prisma } = buildPrismaStub();
    const project = Project.create(
      { name: 'Apollo', projectCode: 'IT-PROJ-9001', status: 'ACTIVE' },
      ProjectId.from('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    );
    const repo = new InMemoryProjectRepository([project]);
    const service = new SubmitProjectForApprovalService(repo, prisma);

    await expect(
      service.execute({ actorId: 'pm-1', projectId: project.projectId.value }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects submission for an already-pending project', async () => {
    const { prisma } = buildPrismaStub();
    const project = Project.create(
      { name: 'Apollo', projectCode: 'IT-PROJ-9001', status: 'PENDING_APPROVAL' },
      ProjectId.from('cccccccc-cccc-cccc-cccc-cccccccccccc'),
    );
    const repo = new InMemoryProjectRepository([project]);
    const service = new SubmitProjectForApprovalService(repo, prisma);

    await expect(
      service.execute({ actorId: 'pm-1', projectId: project.projectId.value }),
    ).rejects.toThrow(/already pending approval/);
  });

  it('rejects when the project does not exist', async () => {
    const { prisma } = buildPrismaStub();
    const repo = new InMemoryProjectRepository([]);
    const service = new SubmitProjectForApprovalService(repo, prisma);

    await expect(
      service.execute({
        actorId: 'pm-1',
        projectId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when actorId is empty', async () => {
    const { prisma } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    const service = new SubmitProjectForApprovalService(repo, prisma);

    await expect(
      service.execute({ actorId: '', projectId: project.projectId.value }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('DecideProjectActivationService', () => {
  async function pendingProjectFixture(): Promise<{
    repo: InMemoryProjectRepository;
    prisma: PrismaService;
    rows: ApprovalRow[];
    projectId: string;
    pmId: string;
  }> {
    const { prisma, rows } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    await new SubmitProjectForApprovalService(repo, prisma).execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
    });
    return { repo, prisma, rows, projectId: project.projectId.value, pmId: 'pm-1' };
  }

  it('approves a PENDING_APPROVAL project, transitioning to ACTIVE and stamping the approval row', async () => {
    const { repo, prisma, rows, projectId } = await pendingProjectFixture();
    const service = new DecideProjectActivationService(repo, prisma);

    const result = await service.execute({
      actorId: 'director-1',
      projectId,
      decision: 'APPROVE',
    });

    expect(result.project.status).toBe('ACTIVE');
    const approval = rows[0];
    expect(approval.decision).toBe('APPROVED');
    expect(approval.decidedById).toBe('director-1');
    expect(approval.decidedAt).not.toBeNull();
  });

  it('rejects a PENDING_APPROVAL project, transitioning to DRAFT and stamping the rejection row', async () => {
    const { repo, prisma, rows, projectId } = await pendingProjectFixture();
    const service = new DecideProjectActivationService(repo, prisma);

    const result = await service.execute({
      actorId: 'director-1',
      projectId,
      decision: 'REJECT',
      reason: 'Budget unclear',
    });

    expect(result.project.status).toBe('DRAFT');
    expect(rows[0].decision).toBe('REJECTED');
    expect(rows[0].reason).toBe('Budget unclear');
  });

  it('forbids the submitter from approving their own project (no rubber-stamp)', async () => {
    const { repo, prisma, projectId, pmId } = await pendingProjectFixture();
    const service = new DecideProjectActivationService(repo, prisma);

    await expect(
      service.execute({ actorId: pmId, projectId, decision: 'APPROVE' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('requires a reason on REJECT', async () => {
    const { repo, prisma, projectId } = await pendingProjectFixture();
    const service = new DecideProjectActivationService(repo, prisma);

    await expect(
      service.execute({ actorId: 'director-1', projectId, decision: 'REJECT' }),
    ).rejects.toThrow(/reason is required/);
  });

  it('rejects a decision when the project is not PENDING_APPROVAL', async () => {
    const { prisma } = buildPrismaStub();
    const project = Project.create(
      { name: 'Apollo', projectCode: 'IT-PROJ-9001', status: 'DRAFT' },
      ProjectId.from('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    );
    const repo = new InMemoryProjectRepository([project]);
    const service = new DecideProjectActivationService(repo, prisma);

    await expect(
      service.execute({
        actorId: 'director-1',
        projectId: project.projectId.value,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(/PENDING_APPROVAL/);
  });
});

describe('SubmitProjectForApprovalService — ResponsibilityResolver integration (HD-4)', () => {
  it('FALLBACK verdict preserves PENDING_APPROVAL behaviour exactly', async () => {
    const { prisma, rows } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    const service = new SubmitProjectForApprovalService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(FALLBACK),
    );

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
    });

    expect(result.project.status).toBe('PENDING_APPROVAL');
    expect(result.autoApproved).toBe(false);
    expect(rows[0].decision).toBeNull();
  });

  it('SKIP verdict auto-activates the project and writes APPROVED row', async () => {
    const { prisma, rows } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    const verdict: ResponsibilityVerdict = {
      mode: 'SKIP',
      targetRole: null,
      targetPersonId: null,
      ruleId: 'rule-skip',
      source: 'RULE',
      matchedScope: 'CLIENT',
    };
    const service = new SubmitProjectForApprovalService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
    });

    expect(result.project.status).toBe('ACTIVE');
    expect(result.autoApproved).toBe(true);
    expect(result.responsibilityRuleId).toBe('rule-skip');
    expect(rows[0].decision).toBe('APPROVED');
    expect(rows[0].decidedById).toBe('pm-1');
  });

  it('PM_SOLO verdict auto-activates the project (PM self-decides at submit)', async () => {
    const { prisma, rows } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    const verdict: ResponsibilityVerdict = {
      mode: 'PM_SOLO',
      targetRole: 'project_manager',
      targetPersonId: null,
      ruleId: 'rule-pm-solo',
      source: 'RULE',
      matchedScope: 'TENANT',
    };
    const service = new SubmitProjectForApprovalService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
    });

    expect(result.project.status).toBe('ACTIVE');
    expect(result.autoApproved).toBe(true);
    expect(rows[0].decision).toBe('APPROVED');
  });

  it('ROLE verdict (non-fallback) preserves PENDING_APPROVAL — no auto-activate', async () => {
    const { prisma, rows } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    const verdict: ResponsibilityVerdict = {
      mode: 'ROLE',
      targetRole: 'delivery_manager',
      targetPersonId: null,
      ruleId: 'rule-role',
      source: 'RULE',
      matchedScope: 'CLIENT',
    };
    const service = new SubmitProjectForApprovalService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
    });

    expect(result.project.status).toBe('PENDING_APPROVAL');
    expect(result.autoApproved).toBe(false);
    expect(result.responsibilityRuleId).toBe('rule-role');
    expect(rows[0].decision).toBeNull();
  });

  it('resolver throw is caught — service still completes the default flow', async () => {
    const { prisma, rows } = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    const throwingResolver = {
      resolve: async () => {
        throw new Error('resolver-broken');
      },
    } as unknown as ResponsibilityResolverService;
    const service = new SubmitProjectForApprovalService(
      repo,
      prisma,
      undefined,
      undefined,
      throwingResolver,
    );

    const result = await service.execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
    });

    expect(result.project.status).toBe('PENDING_APPROVAL');
    expect(rows[0].decision).toBeNull();
  });
});

describe('DecideProjectActivationService — ResponsibilityResolver integration (HD-4)', () => {
  async function pendingFixture(): Promise<{
    repo: InMemoryProjectRepository;
    prisma: PrismaService;
    rows: Array<{
      id: string;
      decision: 'APPROVED' | 'REJECTED' | null;
      decidedById: string | null;
    }>;
    projectId: string;
  }> {
    const stub = buildPrismaStub();
    const { repo, project } = buildDraftProject();
    await new SubmitProjectForApprovalService(repo, stub.prisma).execute({
      actorId: 'pm-1',
      projectId: project.projectId.value,
    });
    return {
      repo,
      prisma: stub.prisma,
      rows: stub.rows,
      projectId: project.projectId.value,
    };
  }

  it('PERSON verdict matching the actor allows the decision', async () => {
    const { repo, prisma, rows, projectId } = await pendingFixture();
    const verdict: ResponsibilityVerdict = {
      mode: 'PERSON',
      targetRole: null,
      targetPersonId: 'director-anna',
      ruleId: 'rule-person',
      source: 'RULE',
      matchedScope: 'PROJECT',
    };
    const service = new DecideProjectActivationService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'director-anna',
      projectId,
      decision: 'APPROVE',
    });

    expect(result.project.status).toBe('ACTIVE');
    expect(rows[0].decision).toBe('APPROVED');
    expect(rows[0].decidedById).toBe('director-anna');
  });

  it('PERSON verdict mismatching the actor blocks with 403', async () => {
    const { repo, prisma, projectId } = await pendingFixture();
    const verdict: ResponsibilityVerdict = {
      mode: 'PERSON',
      targetRole: null,
      targetPersonId: 'director-anna',
      ruleId: 'rule-person',
      source: 'RULE',
      matchedScope: 'PROJECT',
    };
    const service = new DecideProjectActivationService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    await expect(
      service.execute({
        actorId: 'director-bob',
        projectId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('SKIP verdict at decide time is permissive — Director still clears the in-flight request', async () => {
    const { repo, prisma, rows, projectId } = await pendingFixture();
    const verdict: ResponsibilityVerdict = {
      mode: 'SKIP',
      targetRole: null,
      targetPersonId: null,
      ruleId: 'rule-skip',
      source: 'RULE',
      matchedScope: 'CLIENT',
    };
    const service = new DecideProjectActivationService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: 'director-bob',
      projectId,
      decision: 'APPROVE',
    });

    expect(result.project.status).toBe('ACTIVE');
    expect(rows[0].decision).toBe('APPROVED');
  });

  it('FALLBACK verdict matches existing behaviour (any director can decide)', async () => {
    const { repo, prisma, rows, projectId } = await pendingFixture();
    const service = new DecideProjectActivationService(
      repo,
      prisma,
      undefined,
      undefined,
      stubResolver(FALLBACK),
    );

    const result = await service.execute({
      actorId: 'any-director',
      projectId,
      decision: 'APPROVE',
    });

    expect(result.project.status).toBe('ACTIVE');
    expect(rows[0].decision).toBe('APPROVED');
  });
});
