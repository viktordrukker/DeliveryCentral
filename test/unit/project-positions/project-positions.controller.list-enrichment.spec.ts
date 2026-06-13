import { ProjectPositionsController } from '@src/modules/project-positions/presentation/project-positions.controller';

/**
 * SC-7 — the positions list handler enriches each row with human person/project
 * names at the presentation boundary so the FE (cmdk, Create-Case, Staffing
 * Desk) never renders raw UUIDs. Verifies the batch-resolve + DTO mapping.
 */
function makePosition(over: Record<string, unknown> = {}): never {
  return {
    positionId: { value: 'pos-1' },
    publicId: 'pos_1',
    projectId: 'prj-1',
    role: 'Engineer',
    skills: [],
    priority: 'MEDIUM',
    requiredAllocationPercent: 50,
    fillStatus: { value: 'BOOKED' },
    activePersonId: 'usr-1',
    activeAllocationPercent: 50,
    version: 1,
    ...over,
  } as never;
}

function makeController(listResult: { positions: unknown[]; total: number }, prisma: unknown) {
  const noop = {} as never;
  const listService = { execute: jest.fn().mockResolvedValue(listResult) } as never;
  return new ProjectPositionsController(
    noop, // createService
    noop, // createAndBookService
    noop, // transitionService
    listService,
    noop, // getService
    noop, // suggestFillsService
    noop, // forensicsService
    noop, // historyService
    noop, // bulkReassignService
    prisma as never,
  );
}

describe('ProjectPositionsController.list — SC-7 name enrichment', () => {
  it('enriches each position with resolved person + project names', async () => {
    const prisma = {
      person: { findMany: jest.fn().mockResolvedValue([{ id: 'usr-1', displayName: 'Alice Smith' }]) },
      project: { findMany: jest.fn().mockResolvedValue([{ id: 'prj-1', name: 'Atlas ERP', projectCode: 'PRJ-1' }]) },
    };
    const controller = makeController({ positions: [makePosition()], total: 1 }, prisma);

    const res = await controller.list({} as never);

    expect(res.positions[0]!.activePersonName).toBe('Alice Smith');
    expect(res.positions[0]!.projectName).toBe('Atlas ERP');
    expect(res.positions[0]!.projectCode).toBe('PRJ-1');
    // Batched by id — one query per entity type, not per row.
    expect(prisma.person.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['usr-1'] } } }));
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['prj-1'] } } }));
  });

  it('leaves names undefined (never a UUID) and skips the person query for an unfilled position', async () => {
    const prisma = {
      person: { findMany: jest.fn() },
      project: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const controller = makeController(
      { positions: [makePosition({ activePersonId: undefined, projectId: 'prj-x' })], total: 1 },
      prisma,
    );

    const res = await controller.list({} as never);

    expect(res.positions[0]!.activePersonName).toBeUndefined();
    expect(res.positions[0]!.projectName).toBeUndefined();
    // No active person → no person lookup.
    expect(prisma.person.findMany).not.toHaveBeenCalled();
  });
});
