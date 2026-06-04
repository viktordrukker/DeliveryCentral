import { CreateProjectAssignmentService } from '@src/modules/assignments/application/create-project-assignment.service';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P1-6 — CreateProjectAssignmentService canonical write path.
 *
 * Asserts that when a real Prisma client is wired (production DI),
 * the service writes a `ProjectPosition` row + an opening
 * `ProjectPositionFillHistory` row inside the same transaction that
 * persists the legacy `ProjectAssignment`. D-103 actor-audit is also
 * stamped on the new canonical row.
 */
interface PositionCaptured {
  data: Record<string, unknown>;
}

interface FillHistoryCaptured {
  data: Record<string, unknown>;
}

interface SpyResult {
  prisma: PrismaService;
  positions: PositionCaptured[];
  fillHistory: FillHistoryCaptured[];
}

function buildPrismaSpy(): SpyResult {
  const positions: PositionCaptured[] = [];
  const fillHistory: FillHistoryCaptured[] = [];

  const txClient = {
    projectPosition: {
      create: async (q: { data: Record<string, unknown> }) => {
        positions.push({ data: q.data });
        return { id: 'position-id-stub' };
      },
    },
    projectPositionFillHistory: {
      create: async (q: { data: Record<string, unknown> }) => {
        fillHistory.push({ data: q.data });
        return { id: 'fill-history-stub' };
      },
    },
  };

  const prisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(txClient),
  } as unknown as PrismaService;

  return { prisma, positions, fillHistory };
}

describe('LEAN-P1-6 — canonical ProjectPosition write on create', () => {
  it('writes a ProjectPosition row + opening FillHistory row alongside the legacy assignment', async () => {
    const { prisma, positions, fillHistory } = buildPrismaSpy();
    const repo = new InMemoryProjectAssignmentRepository();
    const service = new CreateProjectAssignmentService(repo, prisma);

    const assignment = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 50,
      endDate: '2025-04-30T23:59:59.999Z',
      note: 'Primary delivery allocation.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    // Canonical position write happened exactly once.
    expect(positions).toHaveLength(1);
    expect(positions[0]?.data).toMatchObject({
      projectId: '33333333-3333-3333-3333-333333333002',
      role: 'Consultant',
      requiredAllocationPercent: '50',
      // Default initial AssignmentStatus is PROPOSED (no initialStatus or
      // draft flag set in the command), which maps 1:1 to PROPOSED in the
      // lean ProjectPositionFillStatus enum.
      fillStatus: 'PROPOSED',
      legacyAssignmentId: assignment.assignmentId.value,
      // D-103 actor-audit stamps on canonical row.
      createdByPersonId: '11111111-1111-1111-1111-111111111006',
      updatedByPersonId: '11111111-1111-1111-1111-111111111006',
    });

    // Opening fill-history row recorded.
    expect(fillHistory).toHaveLength(1);
    expect(fillHistory[0]?.data).toMatchObject({
      positionId: 'position-id-stub',
      changedByPersonId: '11111111-1111-1111-1111-111111111006',
    });
  });

  it('populates activePersonId + active window when initialStatus is BOOKED', async () => {
    const { prisma, positions } = buildPrismaSpy();
    const repo = new InMemoryProjectAssignmentRepository();
    const service = new CreateProjectAssignmentService(repo, prisma);

    await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 75,
      endDate: '2025-04-30T23:59:59.999Z',
      initialStatus: 'BOOKED',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    expect(positions[0]?.data).toMatchObject({
      fillStatus: 'BOOKED',
      activePersonId: '11111111-1111-1111-1111-111111111012',
      activeAllocationPercent: '75',
    });
  });

  it('skips canonical position write when no PrismaService is wired (in-memory unit tests)', async () => {
    const repo = new InMemoryProjectAssignmentRepository();
    // No prisma → PASSTHROUGH_TX_RUNNER path → no canonical write.
    const service = new CreateProjectAssignmentService(repo);

    const assignment = await service.execute({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 50,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      startDate: '2025-03-15T00:00:00.000Z',
      staffingRole: 'Consultant',
    });

    // The service still returns the legacy aggregate; canonical write is
    // simply skipped because there is no Prisma client to talk to.
    expect(assignment.assignmentId.value).toBeTruthy();
  });
});
