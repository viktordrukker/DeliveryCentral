import { ProjectBudgetController } from './budget.controller';

/**
 * SC-7 — listBudgetChangeRequests resolves the requester's display name so the
 * approval queue never shows a raw UUID. Only `prisma` is exercised here; the
 * three injected services are unused by this read path.
 */
describe('ProjectBudgetController.listBudgetChangeRequests — requester name enrichment (SC-7)', () => {
  function makeController(approvals: Array<{ requestedByPersonId: string }>, people: Array<{ id: string; displayName: string }>) {
    const prisma = {
      budgetApproval: {
        findMany: jest.fn().mockResolvedValue(
          approvals.map((a, i) => ({
            id: `appr-${i}`,
            projectBudgetId: 'pb-1',
            status: 'PENDING',
            requestedByPersonId: a.requestedByPersonId,
            requestedAt: new Date('2026-06-01T00:00:00.000Z'),
            requestedChange: { capexBudget: 1, opexBudget: 2 },
            decidedByPersonId: null,
            decisionAt: null,
            decisionReason: null,
          })),
        ),
      },
      person: { findMany: jest.fn().mockResolvedValue(people) },
    };
    return { controller: new ProjectBudgetController(undefined as never, undefined as never, undefined as never, prisma as never), prisma };
  }

  it('resolves requestedByPersonName from the person map', async () => {
    const { controller } = makeController(
      [{ requestedByPersonId: 'p-1' }],
      [{ id: 'p-1', displayName: 'Dana Cole' }],
    );

    const result = await controller.listBudgetChangeRequests('proj-1');

    expect(result[0].requestedByPersonName).toBe('Dana Cole');
    expect(result[0].requestedByPersonId).toBe('p-1');
  });

  it('leaves requestedByPersonName undefined when the requester is unknown', async () => {
    const { controller } = makeController([{ requestedByPersonId: 'ghost' }], []);

    const result = await controller.listBudgetChangeRequests('proj-1');

    expect(result[0].requestedByPersonName).toBeUndefined();
    expect(result[0].requestedByPersonId).toBe('ghost');
  });
});
