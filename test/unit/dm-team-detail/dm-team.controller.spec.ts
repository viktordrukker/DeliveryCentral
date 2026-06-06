import { BadRequestException } from '@nestjs/common';

import { TeamConflictsService } from '@src/modules/dm-team-detail/application/team-conflicts.service';
import { DmTeamController } from '@src/modules/dm-team-detail/presentation/dm-team.controller';
import type { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import type { Request } from 'express';

interface RequestWithPrincipal extends Request {
  principal?: RequestPrincipal;
}

function makeController(): {
  controller: DmTeamController;
  svc: jest.Mocked<TeamConflictsService>;
} {
  const svc = {
    execute: jest.fn().mockResolvedValue({
      asOf: '2026-06-10T00:00:00.000Z',
      conflicts: [],
    }),
  } as unknown as jest.Mocked<TeamConflictsService>;
  return { controller: new DmTeamController(svc), svc };
}

describe('DmTeamController.conflicts (LEAN-P4-missing-8)', () => {
  it('forwards the principal personId as deliveryManagerPersonId', async () => {
    const { controller, svc } = makeController();
    const request = {
      principal: {
        personId: 'dm-1',
        userId: 'user-1',
        roles: ['delivery_manager'] as const,
      },
    } as unknown as RequestWithPrincipal;

    await controller.conflicts(request, '2026-06-10T00:00:00.000Z');

    expect(svc.execute).toHaveBeenCalledTimes(1);
    const call = svc.execute.mock.calls[0][0];
    expect(call.deliveryManagerPersonId).toBe('dm-1');
    expect(call.asOf?.toISOString()).toBe('2026-06-10T00:00:00.000Z');
  });

  it('uses "now" when asOf is omitted', async () => {
    const { controller, svc } = makeController();
    const request = {
      principal: {
        personId: 'dm-1',
        userId: 'user-1',
        roles: ['delivery_manager'] as const,
      },
    } as unknown as RequestWithPrincipal;

    await controller.conflicts(request);

    expect(svc.execute).toHaveBeenCalledTimes(1);
    expect(svc.execute.mock.calls[0][0].asOf).toBeInstanceOf(Date);
  });

  it('rejects requests without a principal personId', async () => {
    const { controller } = makeController();
    const request = {
      principal: {
        userId: 'user-only',
        roles: ['delivery_manager'] as const,
      },
    } as unknown as RequestWithPrincipal;

    await expect(controller.conflicts(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid asOf string', async () => {
    const { controller } = makeController();
    const request = {
      principal: {
        personId: 'dm-1',
        userId: 'user-1',
        roles: ['delivery_manager'] as const,
      },
    } as unknown as RequestWithPrincipal;

    await expect(controller.conflicts(request, 'not-a-date')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
