import { BadRequestException, NotFoundException } from '@nestjs/common';

import { BulkReassignPositionsService } from '@src/modules/project-positions/application/bulk-reassign-positions.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  projectId: string;
  role: string;
  requiredAllocationPercent: string;
  startDate: Date;
  endDate: Date;
  fillStatus: string;
  activePersonId: string | null;
  activeAllocationPercent: string | null;
  activeValidFrom: Date | null;
  activeValidTo: Date | null;
  releaseReason: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  onHoldReason: string | null;
  onHoldCaseId: string | null;
  requestedByPersonId: string | null;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
  version: number;
}

function makeRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: overrides.id ?? 'pos-1',
    projectId: overrides.projectId ?? 'proj-1',
    role: 'Engineer',
    requiredAllocationPercent: '100',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-12-31'),
    fillStatus: overrides.fillStatus ?? 'OPEN',
    activePersonId: overrides.activePersonId ?? null,
    activeAllocationPercent: null,
    activeValidFrom: null,
    activeValidTo: null,
    releaseReason: null,
    rejectionReason: null,
    cancellationReason: null,
    onHoldReason: null,
    onHoldCaseId: null,
    requestedByPersonId: null,
    createdByPersonId: null,
    updatedByPersonId: null,
    version: overrides.version ?? 1,
    ...overrides,
  };
}

interface TxState {
  updates: Array<{ id: string; data: Record<string, unknown>; expectedVersion: number }>;
  historyWrites: Array<Record<string, unknown>>;
  failOnId?: string;
}

function buildPrisma(seed: {
  rows: FakeRow[];
  failOnId?: string;
}): { prisma: PrismaService; state: TxState } {
  const state: TxState = {
    updates: [],
    historyWrites: [],
    failOnId: seed.failOnId,
  };

  const rowsById = new Map(seed.rows.map((row) => [row.id, { ...row }]));

  const tx = {
    projectPosition: {
      updateMany: async (q: {
        where: { id: string; version: number };
        data: Record<string, unknown>;
      }) => {
        state.updates.push({
          id: q.where.id,
          data: q.data,
          expectedVersion: q.where.version,
        });
        if (state.failOnId && q.where.id === state.failOnId) {
          throw new Error(`forced failure on ${q.where.id}`);
        }
        const row = rowsById.get(q.where.id);
        if (!row || row.version !== q.where.version) return { count: 0 };
        Object.assign(row, q.data);
        row.version = q.where.version + 1;
        return { count: 1 };
      },
    },
    projectPositionFillHistory: {
      create: async (q: { data: Record<string, unknown> }) => {
        state.historyWrites.push(q.data);
        return { id: `hist-${state.historyWrites.length}` };
      },
    },
  };

  const prisma = {
    projectPosition: {
      findMany: async (q: { where: { id: { in: string[] } } }) => {
        return q.where.id.in
          .map((id) => rowsById.get(id))
          .filter((r): r is FakeRow => Boolean(r));
      },
    },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      // Snapshot rows in case we need to roll back. The fake tx mutates
      // rowsById in place — on error we just throw without committing the
      // snapshot, which the test asserts via state.updates length vs final
      // row state.
      const snapshot = new Map(
        Array.from(rowsById.entries()).map(([k, v]) => [k, { ...v }]),
      );
      try {
        return await fn(tx);
      } catch (err) {
        // Roll back the in-memory mutations to mirror real $transaction
        // semantics so the service-level rollback assertions are meaningful.
        rowsById.clear();
        for (const [k, v] of snapshot) rowsById.set(k, v);
        throw err;
      }
    },
  } as unknown as PrismaService;

  return { prisma, state };
}

describe('BulkReassignPositionsService (LEAN-P4-missing-1)', () => {
  const actorId = '11111111-1111-1111-1111-111111111111';
  const actorRoles = ['project_manager' as const];

  it('rejects empty positionIds', async () => {
    const { prisma } = buildPrisma({ rows: [] });
    const svc = new BulkReassignPositionsService(prisma);
    await expect(
      svc.execute({
        positionIds: [],
        toPersonId: 'p1',
        actorId,
        actorRoles,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when neither toPersonId nor toProjectId provided', async () => {
    const { prisma } = buildPrisma({ rows: [makeRow({ id: 'pos-1' })] });
    const svc = new BulkReassignPositionsService(prisma);
    await expect(
      svc.execute({ positionIds: ['pos-1'], actorId, actorRoles }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when any position is missing', async () => {
    const { prisma } = buildPrisma({ rows: [makeRow({ id: 'pos-1' })] });
    const svc = new BulkReassignPositionsService(prisma);
    await expect(
      svc.execute({
        positionIds: ['pos-1', 'pos-missing'],
        toPersonId: 'p1',
        actorId,
        actorRoles,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when any position is RELEASED', async () => {
    const { prisma } = buildPrisma({
      rows: [
        makeRow({ id: 'pos-1', fillStatus: 'OPEN' }),
        makeRow({ id: 'pos-2', fillStatus: 'RELEASED' }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma);
    await expect(
      svc.execute({
        positionIds: ['pos-1', 'pos-2'],
        toPersonId: 'p1',
        actorId,
        actorRoles,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('happy path: bulk reassigns active person across already-BOOKED positions', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({
          id: 'pos-1',
          fillStatus: 'BOOKED',
          activePersonId: 'old-person',
        }),
        makeRow({
          id: 'pos-2',
          fillStatus: 'ASSIGNED',
          activePersonId: 'old-person',
        }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma);
    const result = await svc.execute({
      positionIds: ['pos-1', 'pos-2'],
      toPersonId: 'new-person',
      reason: 'Maternity cover',
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(2);
    expect(result.errors).toEqual([]);
    expect(state.updates).toHaveLength(2);
    expect(state.updates[0].data.activePersonId).toBe('new-person');
    expect(state.updates[1].data.activePersonId).toBe('new-person');
    // version bumped exactly once (originalVersion was 1, new should be 2)
    expect(state.updates[0].data.version).toBe(2);
    expect(state.historyWrites).toHaveLength(2);
    expect(state.historyWrites[0].changeType).toBe('ASSIGNED');
    expect(state.historyWrites[0].changeReason).toContain('bulk_reassign:Maternity cover');
    expect(state.historyWrites[0].changeReason).toContain('person:old-person->new-person');
  });

  it('transitions PROPOSED positions to BOOKED when a new person is supplied', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({
          id: 'pos-1',
          fillStatus: 'PROPOSED',
          activePersonId: 'candidate-1',
        }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma);
    const result = await svc.execute({
      positionIds: ['pos-1'],
      toPersonId: 'candidate-2',
      reason: 'Picked from slate',
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].data.fillStatus).toBe('BOOKED');
    expect(state.updates[0].data.activePersonId).toBe('candidate-2');
    expect(state.historyWrites[0].changeType).toBe('BOOKED');
    expect(state.historyWrites[0].newStatus).toBe('BOOKED');
    expect(state.historyWrites[0].previousStatus).toBe('PROPOSED');
  });

  it('moves positions to a different project when toProjectId is set', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({
          id: 'pos-1',
          projectId: 'old-project',
          fillStatus: 'OPEN',
        }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma);
    const result = await svc.execute({
      positionIds: ['pos-1'],
      toProjectId: 'new-project',
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(state.updates[0].data.projectId).toBe('new-project');
    expect(state.historyWrites[0].changeReason).toContain(
      'project:old-project->new-project',
    );
  });

  it('partial-failure rolls back: zero updates committed when any position fails', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({ id: 'pos-1', fillStatus: 'BOOKED' }),
        makeRow({ id: 'pos-2', fillStatus: 'BOOKED' }),
      ],
      failOnId: 'pos-2',
    });
    const svc = new BulkReassignPositionsService(prisma);
    const result = await svc.execute({
      positionIds: ['pos-1', 'pos-2'],
      toPersonId: 'new-person',
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('forced failure on pos-2');
    // Service still attempted updates for both before the throw.
    expect(state.updates.length).toBeGreaterThan(0);
  });

  it('unassigns active person when toPersonId is explicit null', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({
          id: 'pos-1',
          fillStatus: 'BOOKED',
          activePersonId: 'someone',
        }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma);
    const result = await svc.execute({
      positionIds: ['pos-1'],
      toPersonId: null,
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(state.updates[0].data.activePersonId).toBeNull();
  });

  it('deduplicates positionIds before processing', async () => {
    const { prisma, state } = buildPrisma({
      rows: [makeRow({ id: 'pos-1', fillStatus: 'BOOKED' })],
    });
    const svc = new BulkReassignPositionsService(prisma);
    const result = await svc.execute({
      positionIds: ['pos-1', 'pos-1', 'pos-1'],
      toPersonId: 'p1',
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(state.updates).toHaveLength(1);
  });
});
