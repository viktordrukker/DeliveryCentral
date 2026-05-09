import { Prisma } from '@prisma/client';

import { TransitionProjectAssignmentService } from '@src/modules/assignments/application/transition-project-assignment.service';
import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import {
  BillRateResolution,
  EffectiveBillRateResolverService,
} from '@src/modules/financial-governance/application/effective-bill-rate-resolver.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

const ASSIGNMENT_ID = 'aaaa0001-0000-4000-8000-000000000001';
const PERSON_ID = 'bbbb0001-0000-4000-8000-000000000002';
const PROJECT_ID = 'cccc0001-0000-4000-8000-000000000003';

interface PrismaPinSpyOpts {
  alreadyPinned?: boolean;
  personGrade?: string | null;
  personSkills?: string[];
  clientId?: string | null;
}

interface PrismaPinSpyResult {
  prisma: PrismaService;
  pinUpdates: Array<{ id: string; data: Record<string, unknown> }>;
}

function buildPrismaPinSpy(opts: PrismaPinSpyOpts = {}): PrismaPinSpyResult {
  const pinUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];

  const prisma = {
    projectAssignment: {
      findUnique: async (_q: { where: { id: string } }) => ({
        appliedRateCardEntryId: opts.alreadyPinned ? 'pre-pinned-entry' : null,
        personId: PERSON_ID,
        projectId: PROJECT_ID,
        staffingRole: 'Engineer',
        validFrom: new Date('2026-06-01'),
        tenantId: null,
      }),
      update: async (q: { where: { id: string }; data: Record<string, unknown> }) => {
        pinUpdates.push({ id: q.where.id, data: q.data });
        return { id: q.where.id, ...q.data };
      },
    },
    person: {
      findUnique: async () => ({
        grade: opts.personGrade ?? 'g13',
        personSkills: (opts.personSkills ?? []).map((name) => ({ skill: { name } })),
      }),
    },
    project: {
      findUnique: async () => ({ clientId: opts.clientId ?? null }),
    },
  } as unknown as PrismaService;

  return { prisma, pinUpdates };
}

function buildResolverStub(verdict: BillRateResolution): EffectiveBillRateResolverService {
  return { resolve: async () => verdict } as unknown as EffectiveBillRateResolverService;
}

function buildAssignment(): ProjectAssignment {
  return ProjectAssignment.create(
    {
      personId: PERSON_ID,
      projectId: PROJECT_ID,
      requestedByPersonId: PERSON_ID,
      staffingRole: 'Engineer',
      validFrom: new Date('2026-06-01'),
      requestedAt: new Date('2026-05-01'),
      status: AssignmentStatus.proposed(),
    },
    AssignmentId.from(ASSIGNMENT_ID),
  );
}

describe('TransitionProjectAssignmentService — HD-3 BOOKED pin', () => {
  it('pins appliedRateCardEntryId + effectiveBillRate when resolver returns a match', async () => {
    const repo = new InMemoryProjectAssignmentRepository([buildAssignment()]);
    const verdict: BillRateResolution = {
      entryId: 'entry-1',
      rateCardId: 'card-1',
      hourlyRate: new Prisma.Decimal(95.5),
      currencyCode: 'USD',
      resolvedBy: 'TENANT_BASIC',
    };
    const { prisma, pinUpdates } = buildPrismaPinSpy();

    const svc = new TransitionProjectAssignmentService(
      repo,
      undefined,
      undefined,
      undefined,
      undefined,
      buildResolverStub(verdict),
      prisma,
    );

    await svc.execute({
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
      assignmentId: ASSIGNMENT_ID,
      target: 'BOOKED',
    });

    expect(pinUpdates).toHaveLength(1);
    expect(pinUpdates[0].data.appliedRateCardEntryId).toBe('entry-1');
    expect(pinUpdates[0].data.effectiveBillRate).toBeInstanceOf(Prisma.Decimal);
    expect(Number(pinUpdates[0].data.effectiveBillRate)).toBe(95.5);
    expect(pinUpdates[0].data.effectiveBillCurrency).toBe('USD');
  });

  it('does NOT write any pin when resolver returns NONE (missing-rate path)', async () => {
    const repo = new InMemoryProjectAssignmentRepository([buildAssignment()]);
    const verdict: BillRateResolution = {
      entryId: null,
      rateCardId: null,
      hourlyRate: null,
      currencyCode: null,
      resolvedBy: 'NONE',
    };
    const { prisma, pinUpdates } = buildPrismaPinSpy();

    const svc = new TransitionProjectAssignmentService(
      repo,
      undefined,
      undefined,
      undefined,
      undefined,
      buildResolverStub(verdict),
      prisma,
    );

    await svc.execute({
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
      assignmentId: ASSIGNMENT_ID,
      target: 'BOOKED',
    });

    expect(pinUpdates).toHaveLength(0);
  });

  it('skips pinning when the row is already pinned (idempotent re-BOOK)', async () => {
    const repo = new InMemoryProjectAssignmentRepository([buildAssignment()]);
    const verdict: BillRateResolution = {
      entryId: 'fresh-entry',
      rateCardId: 'card-1',
      hourlyRate: new Prisma.Decimal(120),
      currencyCode: 'USD',
      resolvedBy: 'CLIENT_BASIC',
    };
    const { prisma, pinUpdates } = buildPrismaPinSpy({ alreadyPinned: true });

    const svc = new TransitionProjectAssignmentService(
      repo,
      undefined,
      undefined,
      undefined,
      undefined,
      buildResolverStub(verdict),
      prisma,
    );

    await svc.execute({
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
      assignmentId: ASSIGNMENT_ID,
      target: 'BOOKED',
    });

    expect(pinUpdates).toHaveLength(0);
  });

  it('does NOT pin on non-BOOKED transitions (e.g., CANCELLED)', async () => {
    const proposed = buildAssignment();
    proposed.transitionTo('BOOKED', { actorRoles: ['project_manager'] });
    const repo = new InMemoryProjectAssignmentRepository([proposed]);
    const verdict: BillRateResolution = {
      entryId: 'should-not-fire',
      rateCardId: 'card-1',
      hourlyRate: new Prisma.Decimal(120),
      currencyCode: 'USD',
      resolvedBy: 'TENANT_BASIC',
    };
    const { prisma, pinUpdates } = buildPrismaPinSpy();

    const svc = new TransitionProjectAssignmentService(
      repo,
      undefined,
      undefined,
      undefined,
      undefined,
      buildResolverStub(verdict),
      prisma,
    );

    await svc.execute({
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
      assignmentId: ASSIGNMENT_ID,
      target: 'CANCELLED',
      reason: 'Testing',
    });

    expect(pinUpdates).toHaveLength(0);
  });

  it('legacy callers (no resolver/prisma wired) keep pre-HD-3 behaviour exactly', async () => {
    const repo = new InMemoryProjectAssignmentRepository([buildAssignment()]);
    const svc = new TransitionProjectAssignmentService(repo);
    const result = await svc.execute({
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
      assignmentId: ASSIGNMENT_ID,
      target: 'BOOKED',
    });
    expect(result.assignment.status.value).toBe('BOOKED');
  });

  it('resolver throw is swallowed — primary BOOKED transition still succeeds', async () => {
    const repo = new InMemoryProjectAssignmentRepository([buildAssignment()]);
    const throwing: EffectiveBillRateResolverService = {
      resolve: async () => {
        throw new Error('resolver-broken');
      },
    } as unknown as EffectiveBillRateResolverService;
    const { prisma, pinUpdates } = buildPrismaPinSpy();

    const svc = new TransitionProjectAssignmentService(
      repo,
      undefined,
      undefined,
      undefined,
      undefined,
      throwing,
      prisma,
    );

    const result = await svc.execute({
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
      assignmentId: ASSIGNMENT_ID,
      target: 'BOOKED',
    });

    expect(result.assignment.status.value).toBe('BOOKED');
    expect(pinUpdates).toHaveLength(0);
  });
});
