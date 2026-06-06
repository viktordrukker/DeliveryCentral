import { readFileSync } from 'node:fs';

import { BadRequestException } from '@nestjs/common';

import type { BulkReassignOrgMembershipService } from '@src/modules/organization/application/bulk-reassign-org-membership.service';
import { OrganizationController } from '@src/modules/organization/presentation/organization.controller';

function makeController(opts: {
  serviceResult?: { movedPersonIds: string[]; skippedPersonIds: string[]; newMembershipIds: string[] };
  serviceThrows?: Error;
}): {
  controller: OrganizationController;
  svc: jest.Mocked<BulkReassignOrgMembershipService>;
} {
  const svc = {
    execute: opts.serviceThrows
      ? jest.fn().mockRejectedValue(opts.serviceThrows)
      : jest.fn().mockResolvedValue(
          opts.serviceResult ?? {
            movedPersonIds: ['p-1'],
            skippedPersonIds: [],
            newMembershipIds: ['m-1'],
          },
        ),
  } as unknown as jest.Mocked<BulkReassignOrgMembershipService>;

  const controller = new OrganizationController(svc);
  return { controller, svc };
}

const VALID = {
  personIds: ['22222222-2222-2222-2222-222222222222'],
  toOrgUnitId: '55555555-5555-5555-5555-555555555555',
  effectiveFrom: '2026-07-01',
};

describe('OrganizationController.bulkReassign', () => {
  it('rejects an anonymous caller with BadRequestException', async () => {
    const { controller, svc } = makeController({});
    await expect(controller.bulkReassign(VALID, { principal: {} })).rejects.toThrow(
      BadRequestException,
    );
    expect(svc.execute).not.toHaveBeenCalled();
  });

  it('forwards principal.personId as actorId on the happy path', async () => {
    const { controller, svc } = makeController({});
    const result = await controller.bulkReassign(VALID, {
      principal: { personId: 'hr-1' },
    });

    expect(result.movedPersonIds).toEqual(['p-1']);
    expect(svc.execute).toHaveBeenCalledWith({
      personIds: VALID.personIds,
      toOrgUnitId: VALID.toOrgUnitId,
      effectiveFrom: VALID.effectiveFrom,
      reason: undefined,
      actorId: 'hr-1',
    });
  });

  it('falls back to userId when personId is missing', async () => {
    const { controller, svc } = makeController({});
    await controller.bulkReassign(VALID, {
      principal: { userId: 'user-7' },
    });
    expect(svc.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'user-7' }),
    );
  });

  it('propagates service errors', async () => {
    const { controller } = makeController({
      serviceThrows: new Error('boom'),
    });
    await expect(
      controller.bulkReassign(VALID, { principal: { personId: 'hr-1' } }),
    ).rejects.toThrow('boom');
  });
});

describe('OrganizationController.bulkReassign — RBAC source-shape', () => {
  // The controller decorates the route with @RequireRoles(...HR_GOVERNANCE_ROLES)
  // which includes hr_manager + director + admin. Validate at source.
  const src = readFileSync(
    'src/modules/organization/presentation/organization.controller.ts',
    'utf-8',
  );

  it('uses @RequireRoles(...HR_GOVERNANCE_ROLES)', () => {
    expect(src).toMatch(/@RequireRoles\(\.\.\.HR_GOVERNANCE_ROLES\)/);
  });

  it('mounts on POST /org/bulk-reassign-membership', () => {
    expect(src).toMatch(/@Controller\('org'\)/);
    expect(src).toMatch(/@Post\('bulk-reassign-membership'\)/);
  });
});
