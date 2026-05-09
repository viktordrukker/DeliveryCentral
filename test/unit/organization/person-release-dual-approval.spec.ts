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
import { DecidePersonReleaseService } from '@src/modules/organization/application/decide-person-release.service';
import { OpenPersonReleaseRequestService } from '@src/modules/organization/application/open-person-release-request.service';
import { PersonRepositoryPort } from '@src/modules/organization/domain/repositories/person-repository.port';
import { PrismaService } from '@src/shared/persistence/prisma.service';

function stubResolver(verdict: ResponsibilityVerdict): ResponsibilityResolverService {
  return {
    resolve: async () => verdict,
  } as unknown as ResponsibilityResolverService;
}

function attachPersonStub(prisma: PrismaService): void {
  (prisma as unknown as Record<string, unknown>).person = {
    findUnique: async () => ({ orgUnitId: null, grade: null }),
  };
}

const SUBJECT_ID = '11111111-1111-1111-1111-111111111111';
const RM_ID = '22222222-2222-2222-2222-222222222222';
const HR_ID = '33333333-3333-3333-3333-333333333333';
const DIRECTOR_ID = '44444444-4444-4444-4444-444444444444';

interface FakeRequest {
  id: string;
  personId: string;
  initiatedByPersonId: string;
  reason: string;
  reasonCode: string | null;
  targetTerminationDate: Date;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
}

interface FakeApproval {
  id: string;
  requestId: string;
  role: string;
  actorPersonId: string;
  decision: 'APPROVED' | 'REJECTED';
  reason: string | null;
}

function buildFakeStack(personStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' = 'ACTIVE'): {
  prisma: PrismaService;
  personRepository: PersonRepositoryPort;
  requests: FakeRequest[];
  approvals: FakeApproval[];
} {
  const requests: FakeRequest[] = [];
  const approvals: FakeApproval[] = [];

  const personReleaseRequest = {
    findFirst: async (args: {
      where: { personId?: string; status?: string };
    }): Promise<{ id: string } | null> => {
      const row = requests.find(
        (r) =>
          (!args.where.personId || r.personId === args.where.personId) &&
          (!args.where.status || r.status === args.where.status),
      );
      return row ? { id: row.id } : null;
    },
    findUnique: async (args: { where: { id: string } }): Promise<FakeRequest | null> =>
      requests.find((r) => r.id === args.where.id) ?? null,
    create: async (args: { data: Partial<FakeRequest> }): Promise<{ id: string }> => {
      const row: FakeRequest = {
        id: `rel-${requests.length + 1}`,
        personId: args.data.personId!,
        initiatedByPersonId: args.data.initiatedByPersonId!,
        reason: args.data.reason!,
        reasonCode: (args.data.reasonCode as string | null) ?? null,
        targetTerminationDate: args.data.targetTerminationDate as Date,
        status: 'PENDING_APPROVAL',
      };
      requests.push(row);
      return { id: row.id };
    },
    update: async (args: {
      where: { id: string };
      data: Partial<FakeRequest>;
    }): Promise<FakeRequest> => {
      const row = requests.find((r) => r.id === args.where.id);
      if (!row) throw new Error('release request not found');
      Object.assign(row, args.data);
      return row;
    },
  };

  const personReleaseApproval = {
    findMany: async (args: {
      where: { requestId: string };
    }): Promise<FakeApproval[]> =>
      approvals.filter((a) => a.requestId === args.where.requestId),
    create: async (args: { data: Partial<FakeApproval> }): Promise<{ id: string }> => {
      const row: FakeApproval = {
        id: `appr-${approvals.length + 1}`,
        requestId: args.data.requestId!,
        role: args.data.role!,
        actorPersonId: args.data.actorPersonId!,
        decision: args.data.decision as 'APPROVED' | 'REJECTED',
        reason: (args.data.reason as string | null) ?? null,
      };
      approvals.push(row);
      return { id: row.id };
    },
  };

  const prisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> =>
      fn({ personReleaseRequest, personReleaseApproval }),
    personReleaseRequest,
    personReleaseApproval,
  };

  const personRepository = {
    findByPersonId: async (): Promise<{ status: string; displayName: string } | null> => ({
      status: personStatus,
      displayName: 'Test Person',
    }),
  } as unknown as PersonRepositoryPort;

  return {
    prisma: prisma as unknown as PrismaService,
    personRepository,
    requests,
    approvals,
  };
}

describe('OpenPersonReleaseRequestService', () => {
  it('writes a PENDING_APPROVAL request for an active person', async () => {
    const { prisma, personRepository, requests } = buildFakeStack();
    const service = new OpenPersonReleaseRequestService(personRepository, prisma);

    const result = await service.execute({
      actorId: RM_ID,
      personId: SUBJECT_ID,
      reason: 'Performance review outcome',
      targetTerminationDate: '2026-06-30',
    });

    expect(result.requestId).toBeDefined();
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      personId: SUBJECT_ID,
      initiatedByPersonId: RM_ID,
      reason: 'Performance review outcome',
      status: 'PENDING_APPROVAL',
    });
  });

  it('forbids self-release', async () => {
    const { prisma, personRepository } = buildFakeStack();
    const service = new OpenPersonReleaseRequestService(personRepository, prisma);

    await expect(
      service.execute({
        actorId: SUBJECT_ID,
        personId: SUBJECT_ID,
        reason: 'I quit',
        targetTerminationDate: '2026-06-30',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects releasing an INACTIVE person', async () => {
    const { prisma, personRepository } = buildFakeStack('INACTIVE');
    const service = new OpenPersonReleaseRequestService(personRepository, prisma);

    await expect(
      service.execute({
        actorId: RM_ID,
        personId: SUBJECT_ID,
        reason: 'Cleanup',
        targetTerminationDate: '2026-06-30',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a second pending request for the same person', async () => {
    const { prisma, personRepository } = buildFakeStack();
    const service = new OpenPersonReleaseRequestService(personRepository, prisma);

    await service.execute({
      actorId: RM_ID,
      personId: SUBJECT_ID,
      reason: 'First',
      targetTerminationDate: '2026-06-30',
    });
    await expect(
      service.execute({
        actorId: RM_ID,
        personId: SUBJECT_ID,
        reason: 'Second',
        targetTerminationDate: '2026-06-30',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a missing reason', async () => {
    const { prisma, personRepository } = buildFakeStack();
    const service = new OpenPersonReleaseRequestService(personRepository, prisma);

    await expect(
      service.execute({
        actorId: RM_ID,
        personId: SUBJECT_ID,
        reason: '   ',
        targetTerminationDate: '2026-06-30',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an invalid targetTerminationDate', async () => {
    const { prisma, personRepository } = buildFakeStack();
    const service = new OpenPersonReleaseRequestService(personRepository, prisma);

    await expect(
      service.execute({
        actorId: RM_ID,
        personId: SUBJECT_ID,
        reason: 'Bad date',
        targetTerminationDate: 'not-a-date',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when person not found', async () => {
    const { prisma, requests, approvals } = buildFakeStack();
    const personRepository = {
      findByPersonId: async () => null,
    } as unknown as PersonRepositoryPort;
    void requests;
    void approvals;
    const service = new OpenPersonReleaseRequestService(personRepository, prisma);

    await expect(
      service.execute({
        actorId: RM_ID,
        personId: SUBJECT_ID,
        reason: 'Missing',
        targetTerminationDate: '2026-06-30',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('DecidePersonReleaseService', () => {
  async function withPendingFixture(): Promise<{
    prisma: PrismaService;
    requests: FakeRequest[];
    approvals: FakeApproval[];
    requestId: string;
  }> {
    const stack = buildFakeStack();
    const result = await new OpenPersonReleaseRequestService(
      stack.personRepository,
      stack.prisma,
    ).execute({
      actorId: RM_ID,
      personId: SUBJECT_ID,
      reason: 'Performance review',
      targetTerminationDate: '2026-06-30',
    });
    return {
      prisma: stack.prisma,
      requests: stack.requests,
      approvals: stack.approvals,
      requestId: result.requestId,
    };
  }

  it('partial-approval (HR only): leaves request PENDING_APPROVAL with one approval row', async () => {
    const { prisma, requests, approvals, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    const result = await service.execute({
      actorId: HR_ID,
      decisionRole: 'hr_manager',
      requestId,
      decision: 'APPROVE',
    });

    expect(result.finalStatus).toBe('PENDING_APPROVAL');
    expect(result.fullyApproved).toBe(false);
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({ role: 'hr_manager', decision: 'APPROVED' });
    // Request status NOT yet flipped — both approvals required.
    expect(requests[0].status).toBe('PENDING_APPROVAL');
  });

  it('full-approval (HR then Director): flips request to APPROVED', async () => {
    const { prisma, requests, approvals, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await service.execute({
      actorId: HR_ID,
      decisionRole: 'hr_manager',
      requestId,
      decision: 'APPROVE',
    });
    const result = await service.execute({
      actorId: DIRECTOR_ID,
      decisionRole: 'director',
      requestId,
      decision: 'APPROVE',
    });

    expect(result.finalStatus).toBe('APPROVED');
    expect(result.fullyApproved).toBe(true);
    expect(approvals).toHaveLength(2);
    expect(requests[0].status).toBe('APPROVED');
  });

  it('single REJECT short-circuits the workflow regardless of other slot', async () => {
    const { prisma, requests, approvals, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    const result = await service.execute({
      actorId: DIRECTOR_ID,
      decisionRole: 'director',
      requestId,
      decision: 'REJECT',
      reason: 'Reconsider in Q3',
    });

    expect(result.finalStatus).toBe('REJECTED');
    expect(result.fullyApproved).toBe(false);
    expect(approvals[0].decision).toBe('REJECTED');
    expect(requests[0].status).toBe('REJECTED');
  });

  it('forbids the initiator from deciding their own request (no rubber-stamp)', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await expect(
      service.execute({
        actorId: RM_ID,
        decisionRole: 'hr_manager',
        requestId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids the subject from deciding on their own release', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await expect(
      service.execute({
        actorId: SUBJECT_ID,
        decisionRole: 'hr_manager',
        requestId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a second decision from the same role (one slot per role)', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await service.execute({
      actorId: HR_ID,
      decisionRole: 'hr_manager',
      requestId,
      decision: 'APPROVE',
    });
    await expect(
      service.execute({
        actorId: '55555555-5555-5555-5555-555555555555',
        decisionRole: 'hr_manager',
        requestId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('requires a reason on REJECT', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await expect(
      service.execute({
        actorId: HR_ID,
        decisionRole: 'hr_manager',
        requestId,
        decision: 'REJECT',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a decision on an already-rejected request', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await service.execute({
      actorId: HR_ID,
      decisionRole: 'hr_manager',
      requestId,
      decision: 'REJECT',
      reason: 'Not now',
    });
    await expect(
      service.execute({
        actorId: DIRECTOR_ID,
        decisionRole: 'director',
        requestId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects an unknown requestId', async () => {
    const { prisma } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await expect(
      service.execute({
        actorId: HR_ID,
        decisionRole: 'hr_manager',
        requestId: '99999999-9999-9999-9999-999999999999',
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an unknown decisionRole', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const service = new DecidePersonReleaseService(prisma);

    await expect(
      service.execute({
        actorId: HR_ID,
        decisionRole: 'unknown_role' as 'hr_manager',
        requestId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('DecidePersonReleaseService — ResponsibilityResolver integration (HD-4)', () => {
  async function withPendingFixture(): Promise<{
    prisma: PrismaService;
    approvals: FakeApproval[];
    requests: FakeRequest[];
    requestId: string;
  }> {
    const stack = buildFakeStack();
    const result = await new OpenPersonReleaseRequestService(
      stack.personRepository,
      stack.prisma,
    ).execute({
      actorId: RM_ID,
      personId: SUBJECT_ID,
      reason: 'Performance review',
      targetTerminationDate: '2026-06-30',
    });
    attachPersonStub(stack.prisma);
    return {
      prisma: stack.prisma,
      approvals: stack.approvals,
      requests: stack.requests,
      requestId: result.requestId,
    };
  }

  it('PERSON verdict for HR slot blocks a non-matching HR Manager with 403', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const verdict: ResponsibilityVerdict = {
      mode: 'PERSON',
      targetRole: null,
      targetPersonId: 'hr-anna',
      ruleId: 'rule-hr-person',
      source: 'RULE',
      matchedScope: 'ORG_UNIT',
    };
    const service = new DecidePersonReleaseService(
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    await expect(
      service.execute({
        actorId: HR_ID,
        decisionRole: 'hr_manager',
        requestId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('PERSON verdict for HR slot allows the matching HR Manager', async () => {
    const { prisma, approvals, requestId } = await withPendingFixture();
    const verdict: ResponsibilityVerdict = {
      mode: 'PERSON',
      targetRole: null,
      targetPersonId: HR_ID,
      ruleId: 'rule-hr-person',
      source: 'RULE',
      matchedScope: 'ORG_UNIT',
    };
    const service = new DecidePersonReleaseService(
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    const result = await service.execute({
      actorId: HR_ID,
      decisionRole: 'hr_manager',
      requestId,
      decision: 'APPROVE',
    });

    expect(result.finalStatus).toBe('PENDING_APPROVAL');
    expect(approvals).toHaveLength(1);
    expect(approvals[0].role).toBe('hr_manager');
  });

  it('FALLBACK verdict preserves the existing dual-approval behaviour', async () => {
    const { prisma, approvals, requestId } = await withPendingFixture();
    const fallback: ResponsibilityVerdict = {
      mode: 'ROLE',
      targetRole: 'hr_manager',
      targetPersonId: null,
      ruleId: null,
      source: 'FALLBACK',
      matchedScope: null,
    };
    const service = new DecidePersonReleaseService(
      prisma,
      undefined,
      undefined,
      stubResolver(fallback),
    );

    const result = await service.execute({
      actorId: HR_ID,
      decisionRole: 'hr_manager',
      requestId,
      decision: 'APPROVE',
    });

    expect(result.finalStatus).toBe('PENDING_APPROVAL');
    expect(approvals[0].role).toBe('hr_manager');
  });

  it('PERSON verdict for Director slot blocks a non-matching Director with 403', async () => {
    const { prisma, requestId } = await withPendingFixture();
    const verdict: ResponsibilityVerdict = {
      mode: 'PERSON',
      targetRole: null,
      targetPersonId: 'director-anna',
      ruleId: 'rule-dir-person',
      source: 'RULE',
      matchedScope: 'CLIENT',
    };
    const service = new DecidePersonReleaseService(
      prisma,
      undefined,
      undefined,
      stubResolver(verdict),
    );

    await expect(
      service.execute({
        actorId: DIRECTOR_ID,
        decisionRole: 'director',
        requestId,
        decision: 'APPROVE',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
