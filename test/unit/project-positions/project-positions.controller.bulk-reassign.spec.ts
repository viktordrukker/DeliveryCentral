import type {
  BulkReassignPositionsResult,
  BulkReassignPositionsService,
} from '@src/modules/project-positions/application/bulk-reassign-positions.service';
import { ProjectPositionsController } from '@src/modules/project-positions/presentation/project-positions.controller';
import type { Request } from 'express';
import type { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

interface RequestWithPrincipal extends Request {
  principal?: RequestPrincipal;
}

function makeController(
  result: BulkReassignPositionsResult = {
    reassigned: 2,
    positionIds: ['pos-1', 'pos-2'],
    errors: [],
  },
): { controller: ProjectPositionsController; svc: jest.Mocked<BulkReassignPositionsService> } {
  const svc = {
    execute: jest.fn().mockResolvedValue(result),
  } as unknown as jest.Mocked<BulkReassignPositionsService>;

  const noop = {} as never;
  const controller = new ProjectPositionsController(
    noop, // createService
    noop, // transitionService
    noop, // listService
    noop, // getService
    noop, // suggestFillsService
    noop, // forensicsService
    noop, // historyService
    svc,
  );
  return { controller, svc };
}

describe('ProjectPositionsController.bulkReassign (LEAN-P4-missing-1)', () => {
  it('forwards request body and actor identity to the service', async () => {
    const { controller, svc } = makeController();
    const request = {
      principal: {
        personId: 'actor-1',
        userId: 'user-1',
        roles: ['project_manager'] as const,
      },
    } as unknown as RequestWithPrincipal;

    const result = await controller.bulkReassign(
      {
        positionIds: ['pos-1', 'pos-2'],
        toPersonId: 'new-person',
        toProjectId: 'new-project',
        reason: 'Quarterly reshuffle',
      },
      request,
    );

    expect(svc.execute).toHaveBeenCalledWith({
      positionIds: ['pos-1', 'pos-2'],
      toPersonId: 'new-person',
      toProjectId: 'new-project',
      reason: 'Quarterly reshuffle',
      actorId: 'actor-1',
      actorRoles: ['project_manager'],
    });
    expect(result.reassigned).toBe(2);
  });

  it('falls back to userId when personId is missing on the principal', async () => {
    const { controller, svc } = makeController();
    const request = {
      principal: {
        userId: 'user-only',
        roles: ['delivery_manager'] as const,
      },
    } as unknown as RequestWithPrincipal;

    await controller.bulkReassign(
      { positionIds: ['pos-1'], toPersonId: 'p1' },
      request,
    );

    expect(svc.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'user-only' }),
    );
  });

  it('uses empty actorId when no principal is present', async () => {
    const { controller, svc } = makeController();
    const request = {} as RequestWithPrincipal;

    await controller.bulkReassign(
      { positionIds: ['pos-1'], toPersonId: 'p1' },
      request,
    );

    expect(svc.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: '', actorRoles: [] }),
    );
  });
});
