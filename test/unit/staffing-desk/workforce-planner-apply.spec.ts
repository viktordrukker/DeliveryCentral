import {
  WorkforcePlannerService,
  type PlannerApplyRequestDto,
} from '@src/modules/staffing-desk/application/workforce-planner.service';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

const ACTOR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PERSON_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const PROJECT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

interface Harness {
  service: WorkforcePlannerService;
  positionCreates: Array<Record<string, unknown>>;
  historyCreates: Array<Record<string, unknown>>;
}

function buildHarness(): Harness {
  const positionCreates: Array<Record<string, unknown>> = [];
  const historyCreates: Array<Record<string, unknown>> = [];

  const tx = {
    projectPosition: {
      create: async (q: { data: Record<string, unknown> }) => {
        positionCreates.push(q.data);
        return { id: `pos-${positionCreates.length}` };
      },
    },
    projectPositionFillHistory: {
      create: async (q: { data: Record<string, unknown> }) => {
        historyCreates.push(q.data);
        return { id: `hist-${historyCreates.length}` };
      },
    },
  };

  const prisma = {
    $transaction: async (fn: (txc: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;

  return {
    service: new WorkforcePlannerService(prisma, {} as PlatformSettingsService),
    positionCreates,
    historyCreates,
  };
}

function makeRequest(): PlannerApplyRequestDto {
  return {
    actorId: ACTOR_ID,
    dispatches: [
      {
        personId: PERSON_ID,
        projectId: PROJECT_ID,
        staffingRole: 'Engineer',
        allocationPercent: 80,
        startDate: '2026-07-01',
        note: 'planner pick',
      },
    ],
    hireRequests: [],
    releases: [],
    extensions: [],
  };
}

describe('WorkforcePlannerService.applyPlan — dispatch person threading', () => {
  it('creates the PROPOSED position with the dispatched person as activePersonId', async () => {
    const { service, positionCreates } = buildHarness();

    const result = await service.applyPlan(makeRequest());

    expect(result.errors).toEqual([]);
    expect(result.assignmentsCreated).toBe(1);
    expect(positionCreates).toHaveLength(1);
    expect(positionCreates[0]).toMatchObject({
      projectId: PROJECT_ID,
      role: 'Engineer',
      fillStatus: 'PROPOSED',
      activePersonId: PERSON_ID,
      createdByPersonId: ACTOR_ID,
      updatedByPersonId: ACTOR_ID,
    });
  });

  it('records the dispatched person on the PROPOSED fill-history row', async () => {
    const { service, historyCreates } = buildHarness();

    await service.applyPlan(makeRequest());

    expect(historyCreates).toHaveLength(1);
    expect(historyCreates[0]).toMatchObject({
      positionId: 'pos-1',
      changeType: 'PROPOSED',
      changedByPersonId: ACTOR_ID,
      newStatus: 'PROPOSED',
      newPersonId: PERSON_ID,
    });
  });
});
