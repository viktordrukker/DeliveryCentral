import { ConflictException, NotFoundException } from '@nestjs/common';

import { CreateAndBookProjectPositionService } from '@src/modules/project-positions/application/create-and-book-project-position.service';
import { CreateProjectPositionService } from '@src/modules/project-positions/application/create-project-position.service';
import type { ProjectPositionReferenceRepositoryPort } from '@src/modules/project-positions/application/ports/project-position-reference.repository.port';
import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import type { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
import { ProjectPositionPrismaMapper } from '@src/modules/project-positions/infrastructure/repositories/prisma/project-position-prisma.mapper';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID = '22222222-2222-2222-2222-222222222222';
const ACTOR_ID = '33333333-3333-3333-3333-333333333333';

interface Harness {
  service: CreateAndBookProjectPositionService;
  historyWrites: Array<Record<string, unknown>>;
  saveCalls: Array<{ position: ProjectPosition; tx: unknown }>;
  txObject: Record<string, unknown>;
}

function buildHarness(options: {
  projectExists?: boolean;
  projectIsActive?: boolean;
  personExists?: boolean;
  personIsActive?: boolean;
  failHistoryWriteAt?: number;
} = {}): Harness {
  const historyWrites: Array<Record<string, unknown>> = [];
  const saveCalls: Array<{ position: ProjectPosition; tx: unknown }> = [];
  let historyWriteAttempts = 0;

  const txObject = {
    projectPosition: {},
    projectPositionFillHistory: {
      create: async (q: { data: Record<string, unknown> }) => {
        historyWriteAttempts += 1;
        if (options.failHistoryWriteAt === historyWriteAttempts) {
          throw new Error('ledger write failed');
        }
        historyWrites.push(q.data);
        return { id: `hist-${historyWrites.length}` };
      },
    },
  };

  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(txObject),
  } as unknown as PrismaService;

  const referenceRepository: ProjectPositionReferenceRepositoryPort = {
    projectExists: async () => options.projectExists ?? true,
    projectIsActive: async () => options.projectIsActive ?? true,
    personExists: async () => options.personExists ?? true,
    personIsActive: async () => options.personIsActive ?? true,
  };

  const repository = {
    save: async (aggregate: ProjectPosition, tx?: unknown) => {
      saveCalls.push({ position: aggregate, tx });
    },
  } as unknown as ProjectPositionRepositoryPort;

  const createService = new CreateProjectPositionService(repository, referenceRepository);
  const service = new CreateAndBookProjectPositionService(
    repository,
    prisma,
    createService,
    referenceRepository,
  );

  return { service, historyWrites, saveCalls, txObject };
}

function baseCommand() {
  return {
    actorId: ACTOR_ID,
    projectId: PROJECT_ID,
    personId: PERSON_ID,
    role: 'Engineer',
    allocationPercent: 80,
    startDate: '2026-07-01',
    endDate: '2026-12-31',
  };
}

describe('CreateAndBookProjectPositionService — atomic create-and-book', () => {
  it('creates one position, drives OPEN→PROPOSED→BOOKED, and writes both ledger rows in the same tx', async () => {
    const { service, historyWrites, saveCalls, txObject } = buildHarness();

    const position = await service.execute(baseCommand());

    expect(position.fillStatus.value).toBe('BOOKED');
    expect(position.activePersonId).toBe(PERSON_ID);
    expect(position.activeAllocationPercent).toBe(80);

    // PR-7 field fidelity — create-and-book routes through the same
    // CreateProjectPositionService, so the fidelity fields reach the
    // persistence shape with their defaults instead of being dropped.
    expect(ProjectPositionPrismaMapper.toPersistence(position)).toMatchObject({
      skills: [],
      summary: null,
      priority: 'MEDIUM',
    });

    // One position throughout — create save + two transition saves, all on
    // the same aggregate, all through the same transaction client.
    expect(saveCalls).toHaveLength(3);
    const positionIds = new Set(saveCalls.map((c) => c.position.positionId.value));
    expect(positionIds.size).toBe(1);
    for (const call of saveCalls) {
      expect(call.tx).toBe(txObject);
    }

    expect(historyWrites).toHaveLength(2);
    expect(historyWrites[0]).toEqual({
      positionId: position.positionId.value,
      changeType: 'PROPOSED',
      changedByPersonId: ACTOR_ID,
      changeReason: null,
      previousStatus: 'OPEN',
      newStatus: 'PROPOSED',
      previousPersonId: null,
      newPersonId: PERSON_ID,
    });
    expect(historyWrites[1]).toEqual({
      positionId: position.positionId.value,
      changeType: 'BOOKED',
      changedByPersonId: ACTOR_ID,
      changeReason: null,
      previousStatus: 'PROPOSED',
      newStatus: 'BOOKED',
      previousPersonId: PERSON_ID,
      newPersonId: PERSON_ID,
    });
  });

  it('threads the optional note into both ledger rows as the change reason', async () => {
    const { service, historyWrites } = buildHarness();

    await service.execute({ ...baseCommand(), note: 'direct booking from RM dashboard' });

    expect(historyWrites[0]).toMatchObject({ changeReason: 'direct booking from RM dashboard' });
    expect(historyWrites[1]).toMatchObject({ changeReason: 'direct booking from RM dashboard' });
  });

  it('rejects an unknown project with a 4xx NotFoundException before writing anything', async () => {
    const { service, historyWrites, saveCalls } = buildHarness({ projectExists: false });

    await expect(service.execute(baseCommand())).rejects.toBeInstanceOf(NotFoundException);

    expect(saveCalls).toHaveLength(0);
    expect(historyWrites).toHaveLength(0);
  });

  it('rejects an unknown person with a 4xx NotFoundException before writing anything', async () => {
    const { service, historyWrites, saveCalls } = buildHarness({ personExists: false });

    await expect(service.execute(baseCommand())).rejects.toBeInstanceOf(NotFoundException);

    expect(saveCalls).toHaveLength(0);
    expect(historyWrites).toHaveLength(0);
  });

  it('rejects a closed/archived project with a 409 ConflictException and writes nothing', async () => {
    const { service, historyWrites, saveCalls } = buildHarness({ projectIsActive: false });

    await expect(service.execute(baseCommand())).rejects.toBeInstanceOf(ConflictException);

    expect(saveCalls).toHaveLength(0);
    expect(historyWrites).toHaveLength(0);
  });

  it('rejects a terminated/non-active person with a 409 ConflictException and writes nothing', async () => {
    const { service, historyWrites, saveCalls } = buildHarness({ personIsActive: false });

    await expect(service.execute(baseCommand())).rejects.toBeInstanceOf(ConflictException);

    expect(saveCalls).toHaveLength(0);
    expect(historyWrites).toHaveLength(0);
  });

  it('a partial failure rejects the whole unit and every write went through the rolled-back tx (no orphan)', async () => {
    // Fail the SECOND ledger write (the BOOKED row) — the worst case for the
    // legacy two-call flow, which would have left an orphaned position.
    const { service, saveCalls, txObject } = buildHarness({ failHistoryWriteAt: 2 });

    await expect(service.execute(baseCommand())).rejects.toThrow('ledger write failed');

    // Every position write happened inside the transaction client, so the
    // prisma rollback discards the position and the first ledger row together.
    expect(saveCalls.length).toBeGreaterThan(0);
    for (const call of saveCalls) {
      expect(call.tx).toBe(txObject);
    }
  });
});
