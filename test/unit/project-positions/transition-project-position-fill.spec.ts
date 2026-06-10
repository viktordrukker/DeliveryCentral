import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import { InvalidPositionFillTransitionError, PositionFillStatus } from '@src/modules/project-positions/domain/value-objects/position-fill-status';
import { PositionId } from '@src/modules/project-positions/domain/value-objects/position-id';
import { TransitionProjectPositionFillService } from '@src/modules/project-positions/application/transition-project-position-fill.service';
import type { ProjectPositionRepositoryPort } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
import { UnifiedApprovalQueueService } from '@src/modules/dashboard/application/unified-approval-queue.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';
import type { LeaveRequestsService } from '@src/modules/leave-requests/application/leave-requests.service';
import type { DecideBudgetChangeService } from '@src/modules/financial-governance/application/decide-budget-change.service';
import type { DecideProjectActivationService } from '@src/modules/project-registry/application/decide-project-activation.service';
import type { ApproveCaseService } from '@src/modules/case-management/application/approve-case.service';
import type { TimesheetsService } from '@src/modules/timesheets/application/timesheets.service';
import type { SkillEndorsementService } from '@src/modules/skills/application/skill-endorsement.service';

const POSITION_ID = '6f8d3a2e-1b4c-4d5e-9f0a-123456789abc';

function makePosition(overrides: {
  fillStatus: PositionFillStatus;
  activePersonId?: string;
}): ProjectPosition {
  return ProjectPosition.create(
    {
      projectId: 'proj-1',
      role: 'Engineer',
      requiredAllocationPercent: 100,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-31'),
      fillStatus: overrides.fillStatus,
      activePersonId: overrides.activePersonId,
      version: 2,
    },
    PositionId.from(POSITION_ID),
  );
}

interface Harness {
  service: TransitionProjectPositionFillService;
  historyWrites: Array<Record<string, unknown>>;
  saveCalls: Array<{ position: ProjectPosition; tx: unknown }>;
  txObject: Record<string, unknown>;
}

function buildHarness(position: ProjectPosition): Harness {
  const historyWrites: Array<Record<string, unknown>> = [];
  const saveCalls: Array<{ position: ProjectPosition; tx: unknown }> = [];

  const txObject = {
    projectPosition: {},
    projectPositionFillHistory: {
      create: async (q: { data: Record<string, unknown> }) => {
        historyWrites.push(q.data);
        return { id: `hist-${historyWrites.length}` };
      },
    },
  };

  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(txObject),
  } as unknown as PrismaService;

  const repository = {
    findByPositionId: async () => position,
    save: async (aggregate: ProjectPosition, tx?: unknown) => {
      saveCalls.push({ position: aggregate, tx });
    },
  } as unknown as ProjectPositionRepositoryPort;

  return {
    service: new TransitionProjectPositionFillService(repository, prisma),
    historyWrites,
    saveCalls,
    txObject,
  };
}

describe('TransitionProjectPositionFillService — fill-history ledger', () => {
  it('BOOKED → ASSIGNED writes exactly one history row with correct from/to/actor', async () => {
    const position = makePosition({
      fillStatus: PositionFillStatus.booked(),
      activePersonId: 'person-1',
    });
    const { service, historyWrites } = buildHarness(position);

    await service.execute({
      positionId: POSITION_ID,
      toStatus: 'ASSIGNED',
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
    });

    expect(historyWrites).toHaveLength(1);
    expect(historyWrites[0]).toEqual({
      positionId: POSITION_ID,
      changeType: 'ASSIGNED',
      changedByPersonId: 'actor-1',
      changeReason: null,
      previousStatus: 'BOOKED',
      newStatus: 'ASSIGNED',
      previousPersonId: 'person-1',
      newPersonId: 'person-1',
    });
  });

  it('PROPOSED → BOOKED records the person change and the reason', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.proposed() });
    const { service, historyWrites } = buildHarness(position);

    await service.execute({
      positionId: POSITION_ID,
      toStatus: 'BOOKED',
      actorId: 'actor-2',
      actorRoles: ['delivery_manager'],
      personId: 'person-9',
      reason: 'candidate accepted',
    });

    expect(historyWrites).toHaveLength(1);
    expect(historyWrites[0]).toMatchObject({
      changeType: 'BOOKED',
      changedByPersonId: 'actor-2',
      changeReason: 'candidate accepted',
      previousStatus: 'PROPOSED',
      newStatus: 'BOOKED',
      previousPersonId: null,
      newPersonId: 'person-9',
    });
  });

  it('writes the history row inside the same transaction as the status save', async () => {
    const position = makePosition({
      fillStatus: PositionFillStatus.booked(),
      activePersonId: 'person-1',
    });
    const { service, saveCalls, txObject } = buildHarness(position);

    await service.execute({
      positionId: POSITION_ID,
      toStatus: 'ASSIGNED',
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
    });

    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0].tx).toBe(txObject);
  });

  it('rejects a person-less fill transition (PROPOSED → BOOKED with no active person, no personId)', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.proposed() });
    const { service, historyWrites, saveCalls } = buildHarness(position);

    await expect(
      service.execute({
        positionId: POSITION_ID,
        toStatus: 'BOOKED',
        actorId: 'actor-1',
        actorRoles: ['project_manager'],
      }),
    ).rejects.toBeInstanceOf(InvalidPositionFillTransitionError);

    expect(historyWrites).toHaveLength(0);
    expect(saveCalls).toHaveLength(0);
  });

  it('rejects OPEN → PROPOSED without a personId', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.open() });
    const { service, historyWrites } = buildHarness(position);

    await expect(
      service.execute({
        positionId: POSITION_ID,
        toStatus: 'PROPOSED',
        actorId: 'actor-1',
        actorRoles: ['resource_manager'],
      }),
    ).rejects.toThrow(/requires a person/);

    expect(historyWrites).toHaveLength(0);
  });

  it('writes no history row when the transition is rejected by the state machine', async () => {
    const position = makePosition({ fillStatus: PositionFillStatus.released() });
    const { service, historyWrites, saveCalls } = buildHarness(position);

    await expect(
      service.execute({
        positionId: POSITION_ID,
        toStatus: 'ASSIGNED',
        actorId: 'actor-1',
        actorRoles: ['admin'],
      }),
    ).rejects.toBeInstanceOf(InvalidPositionFillTransitionError);

    expect(historyWrites).toHaveLength(0);
    expect(saveCalls).toHaveLength(0);
  });

  it('unified approvals queue position-proposal APPROVE writes one history row', async () => {
    // A PROPOSED position always carries the proposed candidate — approving
    // books that person (person-less PROPOSED is rejected by the entity).
    const position = makePosition({
      fillStatus: PositionFillStatus.proposed(),
      activePersonId: 'person-5',
    });
    const { service, historyWrites } = buildHarness(position);

    const queue = new UnifiedApprovalQueueService(
      {} as PrismaService,
      {} as LeaveRequestsService,
      {} as DecideBudgetChangeService,
      {} as DecideProjectActivationService,
      {} as ApproveCaseService,
      {} as TimesheetsService,
      service,
      {} as SkillEndorsementService,
    );

    const out = await queue.decide({
      approvalId: POSITION_ID,
      source: 'position-proposal',
      decision: 'APPROVE',
      actorId: 'actor-7',
      actorRoles: ['project_manager'],
      comment: 'approved from queue',
    });

    expect(out.decision).toBe('APPROVED');
    expect(historyWrites).toHaveLength(1);
    expect(historyWrites[0]).toMatchObject({
      positionId: POSITION_ID,
      changeType: 'BOOKED',
      changedByPersonId: 'actor-7',
      previousStatus: 'PROPOSED',
      newStatus: 'BOOKED',
    });
  });
});
