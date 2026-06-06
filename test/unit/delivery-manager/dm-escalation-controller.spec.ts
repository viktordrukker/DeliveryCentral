import { BadRequestException } from '@nestjs/common';

import { DmEscalationController } from '@src/modules/delivery-manager/presentation/dm-escalation.controller';
import type {
  DmEscalationService,
  DmEscalationView,
} from '@src/modules/delivery-manager/application/dm-escalation.service';
import type { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

/**
 * LEAN-P4-missing-9 — controller-level happy-path tests.
 *
 * RBAC is enforced by the `@RequireRoles(...)` decorator + the global
 * RolesGuard; this suite exercises the principal-resolution + service-call
 * wiring of each endpoint.
 */
describe('DmEscalationController', () => {
  function makeFixture() {
    const view: DmEscalationView = {
      id: 'e-1',
      publicId: null,
      sourceKind: 'timesheet',
      sourceId: 's-1',
      reason: 'r',
      status: 'PENDING',
      escalatedByPersonId: 'dm-1',
      escalatedByDisplayName: 'DM 1',
      escalatedToPersonId: null,
      escalatedToDisplayName: null,
      resolvedAt: null,
      resolvedByPersonId: null,
      resolvedByDisplayName: null,
      resolutionNotes: null,
      createdAt: '2026-06-06T10:00:00.000Z',
      updatedAt: '2026-06-06T10:00:00.000Z',
    };
    const svc = {
      createEscalation: jest.fn(async () => view),
      listPending: jest.fn(async () => [view]),
      listMine: jest.fn(async () => [view]),
      confirmEscalation: jest.fn(async () => ({ ...view, status: 'CONFIRMED' as const })),
      overrideEscalation: jest.fn(async () => ({ ...view, status: 'OVERRIDDEN' as const })),
      cancelEscalation: jest.fn(async () => ({ ...view, status: 'CANCELLED' as const })),
    } as unknown as DmEscalationService;
    const controller = new DmEscalationController(svc);
    return { controller, svc };
  }

  function req(principal: Partial<RequestPrincipal> | undefined): { principal?: RequestPrincipal } {
    return { principal: principal as RequestPrincipal | undefined };
  }

  it('create — resolves personId and forwards to service', async () => {
    const { controller, svc } = makeFixture();
    const result = await controller.create(
      {
        sourceKind: 'timesheet',
        sourceId: '11111111-1111-1111-1111-111111111111',
        reason: 'h',
      },
      req({ authSource: 'bearer_token', personId: 'dm-1', roles: ['delivery_manager'] }),
    );

    expect(result.status).toBe('PENDING');
    expect(svc.createEscalation).toHaveBeenCalledWith(
      { personId: 'dm-1', roles: ['delivery_manager'] },
      expect.objectContaining({ sourceKind: 'timesheet', sourceId: '11111111-1111-1111-1111-111111111111', reason: 'h' }),
    );
  });

  it('create — rejects when principal is absent', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.create(
        { sourceKind: 'timesheet', sourceId: '11111111-1111-1111-1111-111111111111', reason: 'h' },
        req(undefined),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('listPending — delegates without principal', async () => {
    const { controller, svc } = makeFixture();
    const result = await controller.listPending();
    expect(result).toHaveLength(1);
    expect(svc.listPending).toHaveBeenCalled();
  });

  it('listMine — passes personId to service', async () => {
    const { controller, svc } = makeFixture();
    const result = await controller.listMine(
      req({ authSource: 'bearer_token', personId: 'dm-1', roles: ['delivery_manager'] }),
    );
    expect(result).toHaveLength(1);
    expect(svc.listMine).toHaveBeenCalledWith('dm-1');
  });

  it('confirm — passes id + notes through', async () => {
    const { controller, svc } = makeFixture();
    const result = await controller.confirm(
      'e-1',
      { notes: 'agreed' },
      req({ authSource: 'bearer_token', personId: 'dir-1', roles: ['director'] }),
    );
    expect(result.status).toBe('CONFIRMED');
    expect(svc.confirmEscalation).toHaveBeenCalledWith(
      { personId: 'dir-1', roles: ['director'] },
      'e-1',
      'agreed',
    );
  });

  it('override — passes id + notes through', async () => {
    const { controller, svc } = makeFixture();
    const result = await controller.override(
      'e-1',
      { notes: 'send back' },
      req({ authSource: 'bearer_token', personId: 'dir-1', roles: ['admin'] }),
    );
    expect(result.status).toBe('OVERRIDDEN');
    expect(svc.overrideEscalation).toHaveBeenCalledWith(
      { personId: 'dir-1', roles: ['admin'] },
      'e-1',
      'send back',
    );
  });

  it('cancel — passes id + notes through', async () => {
    const { controller, svc } = makeFixture();
    const result = await controller.cancel(
      'e-1',
      { notes: 'withdrew' },
      req({ authSource: 'bearer_token', personId: 'dm-1', roles: ['delivery_manager'] }),
    );
    expect(result.status).toBe('CANCELLED');
    expect(svc.cancelEscalation).toHaveBeenCalledWith(
      { personId: 'dm-1', roles: ['delivery_manager'] },
      'e-1',
      'withdrew',
    );
  });
});
