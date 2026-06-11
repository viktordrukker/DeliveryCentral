import { CreateAndBookProjectPositionService } from '@src/modules/project-positions/application/create-and-book-project-position.service';
import { CreateProjectPositionService } from '@src/modules/project-positions/application/create-project-position.service';
import type { ProjectPositionReferenceRepositoryPort } from '@src/modules/project-positions/application/ports/project-position-reference.repository.port';
import { TransitionProjectPositionFillService } from '@src/modules/project-positions/application/transition-project-position-fill.service';
import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import type { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
import {
  InvalidPositionFillTransitionError,
  PositionFillStatus,
} from '@src/modules/project-positions/domain/value-objects/position-fill-status';
import { PositionId } from '@src/modules/project-positions/domain/value-objects/position-id';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

const POSITION_ID = '6f8d3a2e-1b4c-4d5e-9f0a-123456789abc';
const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID = '22222222-2222-2222-2222-222222222222';
const ACTOR_ID = '33333333-3333-3333-3333-333333333333';

interface AllocationRow {
  activeAllocationPercent: number | null;
  requiredAllocationPercent: number;
}

interface TransitionHarness {
  service: TransitionProjectPositionFillService;
  historyWrites: Array<Record<string, unknown>>;
  saveCalls: ProjectPosition[];
  findManyCalls: Array<Record<string, unknown>>;
}

function makePosition(overrides: {
  fillStatus: PositionFillStatus;
  activePersonId?: string;
  activeAllocationPercent?: number;
}): ProjectPosition {
  return ProjectPosition.create(
    {
      projectId: PROJECT_ID,
      role: 'Engineer',
      requiredAllocationPercent: 50,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-31'),
      fillStatus: overrides.fillStatus,
      activePersonId: overrides.activePersonId,
      activeAllocationPercent: overrides.activeAllocationPercent,
      version: 2,
    },
    PositionId.from(POSITION_ID),
  );
}

function buildTransitionHarness(
  position: ProjectPosition,
  otherPositions: AllocationRow[],
): TransitionHarness {
  const historyWrites: Array<Record<string, unknown>> = [];
  const saveCalls: ProjectPosition[] = [];
  const findManyCalls: Array<Record<string, unknown>> = [];

  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        projectPositionFillHistory: {
          create: async (q: { data: Record<string, unknown> }) => {
            historyWrites.push(q.data);
            return { id: `hist-${historyWrites.length}` };
          },
        },
      }),
    projectPosition: {
      findMany: async (args: Record<string, unknown>) => {
        findManyCalls.push(args);
        return otherPositions;
      },
    },
  } as unknown as PrismaService;

  const repository = {
    findByPositionId: async () => position,
    save: async (aggregate: ProjectPosition) => {
      saveCalls.push(aggregate);
    },
  } as unknown as ProjectPositionRepositoryPort;

  return {
    service: new TransitionProjectPositionFillService(repository, prisma),
    historyWrites,
    saveCalls,
    findManyCalls,
  };
}

describe('Σ-allocation guard — transition path (PR-14 Decision D)', () => {
  it('rejects a fill that pushes the person past 100% with a 409 OVERALLOCATION naming the current total', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.open() });
    const { service, historyWrites, saveCalls } = buildTransitionHarness(position, [
      { activeAllocationPercent: 60, requiredAllocationPercent: 60 },
    ]);

    let caught: unknown;
    try {
      await service.execute({
        positionId: POSITION_ID,
        toStatus: 'PROPOSED',
        actorId: ACTOR_ID,
        actorRoles: ['resource_manager'],
        personId: PERSON_ID,
        allocationPercent: 50,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(InvalidPositionFillTransitionError);
    expect(caught).toMatchObject({
      kind: 'OVERALLOCATION',
      message: expect.stringContaining('60%'),
    });
    expect((caught as Error).message).toContain('110%');
    expect(historyWrites).toHaveLength(0);
    expect(saveCalls).toHaveLength(0);
  });

  it('passes at exactly 100% (boundary is inclusive)', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.open() });
    const { service, historyWrites } = buildTransitionHarness(position, [
      { activeAllocationPercent: 50, requiredAllocationPercent: 50 },
    ]);

    await service.execute({
      positionId: POSITION_ID,
      toStatus: 'PROPOSED',
      actorId: ACTOR_ID,
      actorRoles: ['resource_manager'],
      personId: PERSON_ID,
      allocationPercent: 50,
    });

    expect(historyWrites).toHaveLength(1);
    expect(historyWrites[0]).toMatchObject({ newStatus: 'PROPOSED', changeReason: null });
  });

  it('allowOverallocation + RM role skips the guard and records the override on the history row', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.open() });
    const { service, historyWrites } = buildTransitionHarness(position, [
      { activeAllocationPercent: 80, requiredAllocationPercent: 80 },
    ]);

    await service.execute({
      positionId: POSITION_ID,
      toStatus: 'PROPOSED',
      actorId: ACTOR_ID,
      actorRoles: ['resource_manager'],
      personId: PERSON_ID,
      allocationPercent: 50,
      reason: 'critical staffing',
      allowOverallocation: true,
    });

    expect(historyWrites).toHaveLength(1);
    expect(historyWrites[0]).toMatchObject({
      changeReason: `critical staffing — over-allocation override by ${ACTOR_ID}`,
    });
  });

  it('allowOverallocation without an RM/DM/admin role still rejects', async () => {
    const position = makePosition({
      fillStatus: PositionFillStatus.proposed(),
      activePersonId: PERSON_ID,
      activeAllocationPercent: 50,
    });
    const { service, historyWrites } = buildTransitionHarness(position, [
      { activeAllocationPercent: 80, requiredAllocationPercent: 80 },
    ]);

    await expect(
      service.execute({
        positionId: POSITION_ID,
        toStatus: 'BOOKED',
        actorId: ACTOR_ID,
        actorRoles: ['project_manager'],
        allowOverallocation: true,
      }),
    ).rejects.toMatchObject({ kind: 'OVERALLOCATION' });
    expect(historyWrites).toHaveLength(0);
  });

  it('queries only the person’s OTHER allocation-consuming positions with the shared window predicate', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.open() });
    const { service, findManyCalls } = buildTransitionHarness(position, []);

    await service.execute({
      positionId: POSITION_ID,
      toStatus: 'PROPOSED',
      actorId: ACTOR_ID,
      actorRoles: ['resource_manager'],
      personId: PERSON_ID,
      allocationPercent: 100,
      validFrom: '2026-07-01',
      validTo: '2026-09-30',
    });

    expect(findManyCalls).toHaveLength(1);
    expect(findManyCalls[0]).toMatchObject({
      where: {
        activePersonId: PERSON_ID,
        id: { not: POSITION_ID },
        fillStatus: { in: ['PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED'] },
        AND: [
          { OR: [{ activeValidTo: null }, { activeValidTo: { gte: new Date('2026-07-01') } }] },
          { OR: [{ activeValidFrom: null }, { activeValidFrom: { lte: new Date('2026-09-30') } }] },
        ],
      },
    });
  });

  it('does not run the guard on non-consuming transitions (ASSIGNED → ON_HOLD)', async () => {
    const position = makePosition({
      fillStatus: PositionFillStatus.assigned(),
      activePersonId: PERSON_ID,
      activeAllocationPercent: 100,
    });
    const { service, findManyCalls, historyWrites } = buildTransitionHarness(position, [
      { activeAllocationPercent: 100, requiredAllocationPercent: 100 },
    ]);

    await service.execute({
      positionId: POSITION_ID,
      toStatus: 'ON_HOLD',
      actorId: ACTOR_ID,
      actorRoles: ['hr_manager'],
      reason: 'medical leave',
    });

    expect(findManyCalls).toHaveLength(0);
    expect(historyWrites).toHaveLength(1);
  });

  it('rejects validFrom after validTo with a 400 INVALID_DATES before touching the position', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.open() });
    const { service, findManyCalls, historyWrites } = buildTransitionHarness(position, []);

    await expect(
      service.execute({
        positionId: POSITION_ID,
        toStatus: 'PROPOSED',
        actorId: ACTOR_ID,
        actorRoles: ['resource_manager'],
        personId: PERSON_ID,
        allocationPercent: 50,
        validFrom: '2026-09-30',
        validTo: '2026-07-01',
      }),
    ).rejects.toMatchObject({ kind: 'INVALID_DATES' });
    expect(findManyCalls).toHaveLength(0);
    expect(historyWrites).toHaveLength(0);
  });
});

describe('Σ-allocation guard — create-and-book path (PR-14 Decision D)', () => {
  interface CreateAndBookHarness {
    service: CreateAndBookProjectPositionService;
    historyWrites: Array<Record<string, unknown>>;
    saveCalls: ProjectPosition[];
  }

  function buildCreateAndBookHarness(otherPositions: AllocationRow[]): CreateAndBookHarness {
    const historyWrites: Array<Record<string, unknown>> = [];
    const saveCalls: ProjectPosition[] = [];

    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          projectPosition: {},
          projectPositionFillHistory: {
            create: async (q: { data: Record<string, unknown> }) => {
              historyWrites.push(q.data);
              return { id: `hist-${historyWrites.length}` };
            },
          },
        }),
      projectPosition: { findMany: async () => otherPositions },
    } as unknown as PrismaService;

    const referenceRepository: ProjectPositionReferenceRepositoryPort = {
      projectExists: async () => true,
      projectIsActive: async () => true,
      personExists: async () => true,
      personIsActive: async () => true,
    };

    const repository = {
      save: async (aggregate: ProjectPosition) => {
        saveCalls.push(aggregate);
      },
    } as unknown as ProjectPositionRepositoryPort;

    const createService = new CreateProjectPositionService(repository, referenceRepository);
    return {
      service: new CreateAndBookProjectPositionService(
        repository,
        prisma,
        createService,
        referenceRepository,
      ),
      historyWrites,
      saveCalls,
    };
  }

  function baseCommand() {
    return {
      actorId: ACTOR_ID,
      actorRoles: ['project_manager'] as const,
      projectId: PROJECT_ID,
      personId: PERSON_ID,
      role: 'Engineer',
      allocationPercent: 50,
      startDate: '2026-07-01',
      endDate: '2026-12-31',
    };
  }

  it('rejects a booking that pushes the person past 100% before writing anything', async () => {
    const { service, historyWrites, saveCalls } = buildCreateAndBookHarness([
      { activeAllocationPercent: 80, requiredAllocationPercent: 80 },
    ]);

    await expect(service.execute(baseCommand())).rejects.toMatchObject({
      kind: 'OVERALLOCATION',
      message: expect.stringContaining('80%'),
    });
    expect(historyWrites).toHaveLength(0);
    expect(saveCalls).toHaveLength(0);
  });

  it('passes at exactly 100%', async () => {
    const { service, historyWrites } = buildCreateAndBookHarness([
      { activeAllocationPercent: 50, requiredAllocationPercent: 50 },
    ]);

    const position = await service.execute(baseCommand());

    expect(position.fillStatus.value).toBe('BOOKED');
    expect(historyWrites).toHaveLength(2);
  });

  it('allowOverallocation + DM role books anyway and records the override on BOTH ledger rows', async () => {
    const { service, historyWrites } = buildCreateAndBookHarness([
      { activeAllocationPercent: 80, requiredAllocationPercent: 80 },
    ]);

    const position = await service.execute({
      ...baseCommand(),
      actorRoles: ['delivery_manager'] as const,
      note: 'client escalation',
      allowOverallocation: true,
    });

    expect(position.fillStatus.value).toBe('BOOKED');
    expect(historyWrites).toHaveLength(2);
    for (const row of historyWrites) {
      expect(row).toMatchObject({
        changeReason: `client escalation — over-allocation override by ${ACTOR_ID}`,
      });
    }
  });

  it('allowOverallocation without an RM/DM/admin role still rejects', async () => {
    const { service, historyWrites } = buildCreateAndBookHarness([
      { activeAllocationPercent: 80, requiredAllocationPercent: 80 },
    ]);

    await expect(
      service.execute({ ...baseCommand(), allowOverallocation: true }),
    ).rejects.toMatchObject({ kind: 'OVERALLOCATION' });
    expect(historyWrites).toHaveLength(0);
  });

  it('an inverted window rejects with the create service 400 — not a spurious 409', async () => {
    const { service, historyWrites } = buildCreateAndBookHarness([
      { activeAllocationPercent: 80, requiredAllocationPercent: 80 },
    ]);

    await expect(
      service.execute({ ...baseCommand(), startDate: '2026-12-31', endDate: '2026-07-01' }),
    ).rejects.toThrow('Position end date must be on or after the start date.');
    expect(historyWrites).toHaveLength(0);
  });

  it('falls back to requiredAllocationPercent for rows without an explicit active allocation', async () => {
    const { service } = buildCreateAndBookHarness([
      { activeAllocationPercent: null, requiredAllocationPercent: 60 },
    ]);

    await expect(service.execute(baseCommand())).rejects.toMatchObject({
      kind: 'OVERALLOCATION',
      message: expect.stringContaining('60%'),
    });
  });
});
