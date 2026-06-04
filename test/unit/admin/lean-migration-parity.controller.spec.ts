import 'reflect-metadata';

import { LeanMigrationParityController } from '@src/modules/admin/presentation/lean-migration-parity.controller';
import {
  LeanMigrationParityService,
  type LeanMigrationParitySnapshot,
} from '@src/modules/admin/application/lean-migration-parity.service';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';

describe('LeanMigrationParityController (LEAN-P2-9)', () => {
  function makeFixture(snapshot: LeanMigrationParitySnapshot) {
    const serviceMock = {
      snapshot: jest.fn(async () => snapshot),
    } as unknown as LeanMigrationParityService;
    return {
      controller: new LeanMigrationParityController(serviceMock),
      serviceMock,
    };
  }

  it('snapshot() returns the parity snapshot from the service', async () => {
    const fake: LeanMigrationParitySnapshot = {
      capturedAt: '2026-06-04T12:00:00.000Z',
      projectPositionCount: 412,
      projectAssignmentCount: 380,
      staffingRequestCount: 64,
      positionsLinkedToAssignment: 380,
      positionsLinkedToStaffingRequest: 64,
      positionsWithOrphanedAssignmentLink: 0,
      positionsWithOrphanedStaffingRequestLink: 0,
      assignmentsWithoutPosition: 0,
      staffingRequestsWithoutPosition: 0,
      divergenceCount: 0,
    };
    const { controller, serviceMock } = makeFixture(fake);
    const out = await controller.snapshot();
    expect(out).toEqual(fake);
    expect(serviceMock.snapshot).toHaveBeenCalledTimes(1);
  });

  it('controller method is gated by @RequireRoles("admin")', () => {
    // The decorator stores its config on the method via Reflect metadata.
    // Verifying the key exists is enough — the guard wiring is covered by
    // the global RolesGuard suite. This keeps the LEAN-P2-9 controller
    // protected against accidental decorator drops.
    const proto = LeanMigrationParityController.prototype as unknown as Record<
      string,
      unknown
    >;
    const handler = proto.snapshot;
    const meta = Reflect.getMetadata(REQUIRED_ROLES_KEY, handler as object);
    expect(meta).toBeDefined();
    expect(Array.isArray(meta) ? meta : [meta]).toContain('admin');
  });

  it('snapshot shape exposes the divergence sum', async () => {
    const fake: LeanMigrationParitySnapshot = {
      capturedAt: '2026-06-04T12:00:00.000Z',
      projectPositionCount: 100,
      projectAssignmentCount: 90,
      staffingRequestCount: 10,
      positionsLinkedToAssignment: 80,
      positionsLinkedToStaffingRequest: 8,
      positionsWithOrphanedAssignmentLink: 0,
      positionsWithOrphanedStaffingRequestLink: 0,
      assignmentsWithoutPosition: 3,
      staffingRequestsWithoutPosition: 2,
      divergenceCount: 5,
    };
    const { controller } = makeFixture(fake);
    const out = await controller.snapshot();
    expect(out.divergenceCount).toBe(
      out.assignmentsWithoutPosition + out.staffingRequestsWithoutPosition,
    );
  });
});
