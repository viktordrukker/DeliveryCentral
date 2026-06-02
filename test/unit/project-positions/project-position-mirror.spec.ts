/**
 * LEAN-P0-4 — unit tests for the inverted (legacy follower) mirror.
 *
 * Verifies that after a canonical `ProjectPosition` write the paired legacy
 * `ProjectAssignment` row is patched with the equivalent legacy status +
 * window + reason fields, and that brand-new positions with no legacy row
 * are silently skipped.
 */
import { ProjectPositionMirrorService } from '@src/modules/project-positions/application/project-position-mirror.service';
import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import {
  PositionFillStatus,
  PositionFillStatusValue,
} from '@src/modules/project-positions/domain/value-objects/position-fill-status';
import { PositionId } from '@src/modules/project-positions/domain/value-objects/position-id';
import { PrismaService } from '@src/shared/persistence/prisma.service';

const POSITION_ID = '11111111-1111-4111-8111-111111111111';
const LEGACY_ASSIGNMENT_ID = '22222222-2222-4222-8222-222222222222';
const ACTOR_ID = '33333333-3333-4333-8333-333333333333';
const PERSON_ID = '44444444-4444-4444-8444-444444444444';
const PROJECT_ID = '55555555-5555-4555-8555-555555555555';

interface UpdateManyCall {
  where: { id: string };
  data: Record<string, unknown>;
}

interface StubOpts {
  legacyAssignmentId?: string | null;
  activeAllocationPercent?: string | number | null;
  activeValidFrom?: Date | null;
  activeValidTo?: Date | null;
  onboardingDate?: Date | null;
  notes?: string | null;
  updateManyCount?: number;
  positionRowMissing?: boolean;
}

interface StubResult {
  prisma: PrismaService;
  updateManyCalls: UpdateManyCall[];
}

function buildPrismaStub(opts: StubOpts = {}): StubResult {
  const updateManyCalls: UpdateManyCall[] = [];

  const prisma = {
    projectPosition: {
      findUnique: async (_q: { where: { id: string } }) =>
        opts.positionRowMissing
          ? null
          : {
              id: POSITION_ID,
              legacyAssignmentId:
                opts.legacyAssignmentId === undefined ? LEGACY_ASSIGNMENT_ID : opts.legacyAssignmentId,
              activePersonId: PERSON_ID,
              activeAllocationPercent: opts.activeAllocationPercent ?? '50',
              activeValidFrom:
                opts.activeValidFrom === undefined ? new Date('2026-06-01T00:00:00.000Z') : opts.activeValidFrom,
              activeValidTo:
                opts.activeValidTo === undefined ? new Date('2026-12-31T00:00:00.000Z') : opts.activeValidTo,
              onboardingDate: opts.onboardingDate ?? null,
              notes: opts.notes ?? null,
            },
    },
    projectAssignment: {
      updateMany: async (q: { where: { id: string }; data: Record<string, unknown> }) => {
        updateManyCalls.push({ where: q.where, data: q.data });
        return { count: opts.updateManyCount ?? 1 };
      },
    },
  } as unknown as PrismaService;

  return { prisma, updateManyCalls };
}

function makePosition(
  status: PositionFillStatusValue,
  overrides: Partial<{ activePersonId: string; activeAllocationPercent: number; releaseReason: string; onHoldReason: string }> = {},
): ProjectPosition {
  return ProjectPosition.create(
    {
      projectId: PROJECT_ID,
      role: 'Engineer',
      requiredAllocationPercent: 50,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      fillStatus: PositionFillStatus.from(status),
      activePersonId: overrides.activePersonId ?? PERSON_ID,
      activeAllocationPercent: overrides.activeAllocationPercent,
      releaseReason: overrides.releaseReason,
      onHoldReason: overrides.onHoldReason,
    },
    PositionId.from(POSITION_ID),
  );
}

describe('ProjectPositionMirrorService — LEAN-P0-4 inverted (legacy follower)', () => {
  it('propagates ASSIGNED → ASSIGNED legacy status onto the paired ProjectAssignment row', async () => {
    const { prisma, updateManyCalls } = buildPrismaStub();
    const svc = new ProjectPositionMirrorService(prisma);

    await svc.mirrorBackToLegacy(makePosition('ASSIGNED'), ACTOR_ID);

    expect(updateManyCalls).toHaveLength(1);
    expect(updateManyCalls[0].where).toEqual({ id: LEGACY_ASSIGNMENT_ID });
    expect(updateManyCalls[0].data.status).toBe('ASSIGNED');
    expect(updateManyCalls[0].data.updatedByPersonId).toBe(ACTOR_ID);
  });

  it('maps lean RELEASED back to legacy CANCELLED and carries releaseReason into cancellationReason', async () => {
    const { prisma, updateManyCalls } = buildPrismaStub();
    const svc = new ProjectPositionMirrorService(prisma);

    await svc.mirrorBackToLegacy(
      makePosition('RELEASED', { releaseReason: 'project ended early' }),
      ACTOR_ID,
    );

    expect(updateManyCalls).toHaveLength(1);
    expect(updateManyCalls[0].data.status).toBe('CANCELLED');
    expect(updateManyCalls[0].data.cancellationReason).toBe('project ended early');
  });

  it('skips the legacy update entirely when the position has no legacyAssignmentId (Phase-1 native position)', async () => {
    const { prisma, updateManyCalls } = buildPrismaStub({ legacyAssignmentId: null });
    const svc = new ProjectPositionMirrorService(prisma);

    await svc.mirrorBackToLegacy(makePosition('BOOKED'), ACTOR_ID);

    expect(updateManyCalls).toHaveLength(0);
  });

  it('logs but never throws when the legacy row pointed at by legacyAssignmentId no longer exists', async () => {
    const { prisma, updateManyCalls } = buildPrismaStub({ updateManyCount: 0 });
    const svc = new ProjectPositionMirrorService(prisma);

    await expect(
      svc.mirrorBackToLegacy(makePosition('ON_HOLD', { onHoldReason: 'illness' }), ACTOR_ID),
    ).resolves.toBeUndefined();
    expect(updateManyCalls).toHaveLength(1);
  });

  it('swallows internal failures so the canonical write is never blocked', async () => {
    const prisma = {
      projectPosition: {
        findUnique: async () => {
          throw new Error('boom');
        },
      },
      projectAssignment: {
        updateMany: async () => ({ count: 0 }),
      },
    } as unknown as PrismaService;
    const svc = new ProjectPositionMirrorService(prisma);

    await expect(svc.mirrorBackToLegacy(makePosition('ASSIGNED'), ACTOR_ID)).resolves.toBeUndefined();
  });
});
