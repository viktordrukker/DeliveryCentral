import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { BulkReassignPositionsService } from '@src/modules/project-positions/application/bulk-reassign-positions.service';
import type { ProjectPositionReferenceRepositoryPort } from '@src/modules/project-positions/application/ports/project-position-reference.repository.port';
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

function buildReferenceRepo(
  overrides: Partial<Record<keyof ProjectPositionReferenceRepositoryPort, boolean>> = {},
): jest.Mocked<ProjectPositionReferenceRepositoryPort> {
  return {
    projectExists: jest.fn().mockResolvedValue(overrides.projectExists ?? true),
    projectIsActive: jest.fn().mockResolvedValue(overrides.projectIsActive ?? true),
    personExists: jest.fn().mockResolvedValue(overrides.personExists ?? true),
    personIsActive: jest.fn().mockResolvedValue(overrides.personIsActive ?? true),
  };
}

describe('BulkReassignPositionsService (LEAN-P4-missing-1 / PR-15 hardening)', () => {
  const actorId = '11111111-1111-1111-1111-111111111111';
  const actorRoles = ['project_manager' as const];

  it('rejects empty positionIds', async () => {
    const { prisma } = buildPrisma({ rows: [] });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
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
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    await expect(
      svc.execute({ positionIds: ['pos-1'], actorId, actorRoles }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when any position is missing', async () => {
    const { prisma } = buildPrisma({ rows: [makeRow({ id: 'pos-1' })] });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
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
        makeRow({ id: 'pos-1', fillStatus: 'BOOKED', activePersonId: 'x' }),
        makeRow({ id: 'pos-2', fillStatus: 'RELEASED' }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    await expect(
      svc.execute({
        positionIds: ['pos-1', 'pos-2'],
        toPersonId: 'p1',
        actorId,
        actorRoles,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an unknown target person with 404 before any row work', async () => {
    const { prisma, state } = buildPrisma({
      rows: [makeRow({ id: 'pos-1', fillStatus: 'BOOKED', activePersonId: 'x' })],
    });
    const refRepo = buildReferenceRepo({ personExists: false });
    const svc = new BulkReassignPositionsService(prisma, refRepo);
    await expect(
      svc.execute({
        positionIds: ['pos-1'],
        toPersonId: 'ghost-person',
        actorId,
        actorRoles,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(refRepo.personExists).toHaveBeenCalledWith('ghost-person');
    expect(state.updates).toHaveLength(0);
    expect(state.historyWrites).toHaveLength(0);
  });

  it('rejects a non-active target person with 409', async () => {
    const { prisma, state } = buildPrisma({
      rows: [makeRow({ id: 'pos-1', fillStatus: 'BOOKED', activePersonId: 'x' })],
    });
    const refRepo = buildReferenceRepo({ personIsActive: false });
    const svc = new BulkReassignPositionsService(prisma, refRepo);
    await expect(
      svc.execute({
        positionIds: ['pos-1'],
        toPersonId: 'terminated-person',
        actorId,
        actorRoles,
      }),
    ).rejects.toThrow(ConflictException);
    expect(state.updates).toHaveLength(0);
  });

  it('skips person validation when toPersonId is null (unassign)', async () => {
    const { prisma } = buildPrisma({
      rows: [makeRow({ id: 'pos-1', fillStatus: 'BOOKED', activePersonId: 'someone' })],
    });
    const refRepo = buildReferenceRepo({ personExists: false, personIsActive: false });
    const svc = new BulkReassignPositionsService(prisma, refRepo);
    const result = await svc.execute({
      positionIds: ['pos-1'],
      toPersonId: null,
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(refRepo.personExists).not.toHaveBeenCalled();
    expect(refRepo.personIsActive).not.toHaveBeenCalled();
  });

  it('happy path: bulk reassigns active person across already-BOOKED positions with a truthful REASSIGNED ledger', async () => {
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
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
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
    // Truthful ledger: an in-place swap is REASSIGNED with the unchanged
    // status on both sides and the real person delta — not a fabricated
    // ASSIGNED progression.
    expect(state.historyWrites[0].changeType).toBe('REASSIGNED');
    expect(state.historyWrites[0].previousStatus).toBe('BOOKED');
    expect(state.historyWrites[0].newStatus).toBe('BOOKED');
    expect(state.historyWrites[0].previousPersonId).toBe('old-person');
    expect(state.historyWrites[0].newPersonId).toBe('new-person');
    expect(state.historyWrites[1].changeType).toBe('REASSIGNED');
    expect(state.historyWrites[1].previousStatus).toBe('ASSIGNED');
    expect(state.historyWrites[1].newStatus).toBe('ASSIGNED');
    expect(state.historyWrites[0].changeReason).toContain('bulk_reassign:Maternity cover');
    expect(state.historyWrites[0].changeReason).toContain('person:old-person->new-person');
  });

  it('rejects person reassignment on DRAFT/OPEN rows per-row and keeps the partial-failure envelope', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({ id: 'pos-open', fillStatus: 'OPEN' }),
        makeRow({ id: 'pos-draft', fillStatus: 'DRAFT' }),
        makeRow({
          id: 'pos-booked',
          fillStatus: 'BOOKED',
          activePersonId: 'old-person',
        }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    const result = await svc.execute({
      positionIds: ['pos-open', 'pos-draft', 'pos-booked'],
      toPersonId: 'new-person',
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(result.positionIds).toEqual(['pos-booked']);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('pos-open: NOT_FILLED');
    expect(result.errors[1]).toContain('pos-draft: NOT_FILLED');
    // No writes for the rejected rows — DRAFT/OPEN never get a silent
    // in-place person swap.
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].id).toBe('pos-booked');
    expect(state.historyWrites).toHaveLength(1);
  });

  it('returns 422 when every row fails per-row validation', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({ id: 'pos-open', fillStatus: 'OPEN' }),
        makeRow({ id: 'pos-draft', fillStatus: 'DRAFT' }),
      ],
    });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    const promise = svc.execute({
      positionIds: ['pos-open', 'pos-draft'],
      toPersonId: 'new-person',
      actorId,
      actorRoles,
    });
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
    await promise.catch((err: UnprocessableEntityException) => {
      const body = err.getResponse() as { message: string[] };
      expect(body.message).toHaveLength(2);
      expect(body.message[0]).toContain('pos-open: NOT_FILLED');
      expect(body.message[1]).toContain('pos-draft: NOT_FILLED');
    });
    expect(state.updates).toHaveLength(0);
    expect(state.historyWrites).toHaveLength(0);
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
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
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
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    const result = await svc.execute({
      positionIds: ['pos-1'],
      toProjectId: 'new-project',
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(state.updates[0].data.projectId).toBe('new-project');
    expect(state.historyWrites[0].changeType).toBe('REASSIGNED');
    expect(state.historyWrites[0].previousStatus).toBe('OPEN');
    expect(state.historyWrites[0].newStatus).toBe('OPEN');
    expect(state.historyWrites[0].changeReason).toContain(
      'project:old-project->new-project',
    );
  });

  it('returns 422 (not 200) when the transaction rolls back and every row failed', async () => {
    const { prisma, state } = buildPrisma({
      rows: [
        makeRow({ id: 'pos-1', fillStatus: 'BOOKED', activePersonId: 'x' }),
        makeRow({ id: 'pos-2', fillStatus: 'BOOKED', activePersonId: 'x' }),
      ],
      failOnId: 'pos-2',
    });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    const promise = svc.execute({
      positionIds: ['pos-1', 'pos-2'],
      toPersonId: 'new-person',
      actorId,
      actorRoles,
    });
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
    await promise.catch((err: UnprocessableEntityException) => {
      const body = err.getResponse() as { message: string[] };
      expect(body.message.join(' ')).toContain('forced failure on pos-2');
      expect(body.message.join(' ')).toContain('transaction rolled back');
    });
    // Service still attempted updates for both before the throw.
    expect(state.updates.length).toBeGreaterThan(0);
  });

  it('includes per-row NOT_FILLED errors in the 422 when the transaction also rolls back', async () => {
    const { prisma } = buildPrisma({
      rows: [
        makeRow({ id: 'pos-open', fillStatus: 'OPEN' }),
        makeRow({ id: 'pos-booked', fillStatus: 'BOOKED', activePersonId: 'x' }),
      ],
      failOnId: 'pos-booked',
    });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    const promise = svc.execute({
      positionIds: ['pos-open', 'pos-booked'],
      toPersonId: 'new-person',
      actorId,
      actorRoles,
    });
    await expect(promise).rejects.toThrow(UnprocessableEntityException);
    await promise.catch((err: UnprocessableEntityException) => {
      const body = err.getResponse() as { message: string[] };
      expect(body.message[0]).toContain('pos-open: NOT_FILLED');
      expect(body.message[1]).toContain('forced failure on pos-booked');
    });
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
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
    const result = await svc.execute({
      positionIds: ['pos-1'],
      toPersonId: null,
      actorId,
      actorRoles,
    });
    expect(result.reassigned).toBe(1);
    expect(state.updates[0].data.activePersonId).toBeNull();
    expect(state.historyWrites[0].changeType).toBe('REASSIGNED');
    expect(state.historyWrites[0].previousPersonId).toBe('someone');
    expect(state.historyWrites[0].newPersonId).toBeNull();
  });

  it('deduplicates positionIds before processing', async () => {
    const { prisma, state } = buildPrisma({
      rows: [makeRow({ id: 'pos-1', fillStatus: 'BOOKED', activePersonId: 'x' })],
    });
    const svc = new BulkReassignPositionsService(prisma, buildReferenceRepo());
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
