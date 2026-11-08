import { BadRequestException } from '@nestjs/common';

import type {
  CustomRoleDto,
  CustomRoleService,
} from '@src/modules/identity-access/application/custom-role.service';
import { CustomRoleController } from '@src/modules/identity-access/presentation/custom-role.controller';
import type { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

/**
 * NEW-LGL-3 — controller wiring tests.
 *
 * RBAC is enforced by the `@RequireRoles('admin')` decorator + the
 * global RbacGuard; this suite verifies principal resolution and the
 * forward-to-service plumbing of each endpoint.
 */
describe('CustomRoleController', () => {
  function makeFixture() {
    const view: CustomRoleDto = {
      id: 'cr-0001',
      publicId: null,
      roleKey: 'squad_lead',
      displayName: 'Squad Lead',
      description: 'Owns a squad.',
      inheritedRoles: ['project_manager'],
      isBuiltIn: false,
      active: true,
      deactivatedAt: null,
      createdAt: '2026-06-06T10:00:00.000Z',
      updatedAt: '2026-06-06T10:00:00.000Z',
      createdByPersonId: 'p-1',
      updatedByPersonId: 'p-1',
    };
    const svc = {
      list: jest.fn(async () => [view]),
      findById: jest.fn(async () => view),
      create: jest.fn(async () => view),
      update: jest.fn(async () => ({ ...view, displayName: 'Squad Lead (renamed)' })),
      deactivate: jest.fn(async () => ({
        ...view,
        active: false,
        deactivatedAt: '2026-06-06T10:05:00.000Z',
      })),
      reactivate: jest.fn(async () => view),
      listAvailablePermissions: jest.fn(() => [
        'admin',
        'director',
        'hr_manager',
        'delivery_manager',
        'project_manager',
        'resource_manager',
        'employee',
      ]),
      listBuiltInRoles: jest.fn(() => [
        { roleKey: 'admin', displayName: 'Administrator', description: '', isBuiltIn: true, active: true },
      ]),
    } as unknown as CustomRoleService;
    const controller = new CustomRoleController(svc);
    return { controller, svc, view };
  }

  function req(principal: Partial<RequestPrincipal> | undefined): {
    principal?: RequestPrincipal;
  } {
    return { principal: principal as RequestPrincipal | undefined };
  }

  it('list — returns the array from the service', async () => {
    const { controller, svc } = makeFixture();
    const out = await controller.list();
    expect(out).toHaveLength(1);
    expect(svc.list).toHaveBeenCalledWith(true);
  });

  it('findById — passes id through', async () => {
    const { controller, svc } = makeFixture();
    await controller.findById('11111111-1111-1111-1111-111111111111');
    expect(svc.findById).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });

  it('listAvailablePermissions — returns the seven roles', () => {
    const { controller } = makeFixture();
    const out = controller.listAvailablePermissions();
    expect(out).toHaveLength(7);
  });

  it('listBuiltInRoles — returns descriptors from service', () => {
    const { controller, svc } = makeFixture();
    const out = controller.listBuiltInRoles();
    expect(out).toHaveLength(1);
    expect(svc.listBuiltInRoles).toHaveBeenCalled();
  });

  it('create — resolves personId and forwards to service', async () => {
    const { controller, svc } = makeFixture();
    const body = {
      roleKey: 'squad_lead',
      displayName: 'Squad Lead',
      inheritedRoles: ['project_manager'],
    };
    const out = await controller.create(body, req({ personId: 'p-1', userId: 'u-1', roles: [] }));
    expect(svc.create).toHaveBeenCalledWith(body, 'p-1');
    expect(out.roleKey).toBe('squad_lead');
  });

  it('create — falls back to userId when personId is absent', async () => {
    const { controller, svc } = makeFixture();
    const body = {
      roleKey: 'tribe_lead',
      displayName: 'Tribe Lead',
      inheritedRoles: ['delivery_manager'],
    };
    await controller.create(body, req({ userId: 'u-2', roles: [] }));
    expect(svc.create).toHaveBeenCalledWith(body, 'u-2');
  });

  it('create — throws BadRequestException when actor is unresolvable', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.create(
        {
          roleKey: 'svc_owner',
          displayName: 'IT Service Owner',
          inheritedRoles: ['delivery_manager'],
        },
        req(undefined),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update — forwards body and actor', async () => {
    const { controller, svc } = makeFixture();
    const out = await controller.update(
      '11111111-1111-1111-1111-111111111111',
      { displayName: 'Squad Lead (renamed)' },
      req({ personId: 'p-1', roles: [] }),
    );
    expect(svc.update).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      { displayName: 'Squad Lead (renamed)' },
      'p-1',
    );
    expect(out.displayName).toBe('Squad Lead (renamed)');
  });

  it('remove — parses ?assignedCount query and forwards', async () => {
    const { controller, svc } = makeFixture();
    await controller.remove(
      '11111111-1111-1111-1111-111111111111',
      '3',
      req({ personId: 'p-1', roles: [] }),
    );
    expect(svc.deactivate).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'p-1',
      3,
    );
  });

  it('remove — defaults assignedCount to 0 when query absent', async () => {
    const { controller, svc } = makeFixture();
    await controller.remove(
      '11111111-1111-1111-1111-111111111111',
      undefined,
      req({ personId: 'p-1', roles: [] }),
    );
    expect(svc.deactivate).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'p-1',
      0,
    );
  });

  it('reactivate — forwards id and actor', async () => {
    const { controller, svc } = makeFixture();
    await controller.reactivate(
      '11111111-1111-1111-1111-111111111111',
      req({ personId: 'p-1', roles: [] }),
    );
    expect(svc.reactivate).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111', 'p-1');
  });
});
