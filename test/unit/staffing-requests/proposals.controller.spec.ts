/**
 * LEAN-P4c-2 — ProposalsController unit tests.
 *
 * Covers:
 *   - RBAC: queue is gated by ALL_MANAGER_ROLES (RM/PM/HR/DM/director/admin).
 *   - Pagination passthrough: query string page/pageSize parsed to int.
 *   - Default behavior when no query string supplied.
 */
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_MANAGER_ROLES } from '@src/shared/auth/role-presets';
import { ProposalsController } from '@src/modules/staffing-requests/presentation/proposals.controller';
import { UnifiedCandidateQueueService } from '@src/modules/staffing-requests/application/unified-candidate-queue.service';

function makeFixture() {
  const list = jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 50 });
  const service = { list } as unknown as UnifiedCandidateQueueService;
  const controller = new ProposalsController(service);
  return { controller, list };
}

describe('ProposalsController (LEAN-P4c-2)', () => {
  it('queue() defers to UnifiedCandidateQueueService.list and returns its result', async () => {
    const { controller, list } = makeFixture();
    const result = await controller.queue();
    expect(list).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rows: [], total: 0, page: 1, pageSize: 50 });
  });

  it('queue() passes parsed page/pageSize to the service', async () => {
    const { controller, list } = makeFixture();
    await controller.queue('3', '25');
    expect(list).toHaveBeenCalledWith({ page: 3, pageSize: 25 });
  });

  it('queue() passes undefined when query params are absent', async () => {
    const { controller, list } = makeFixture();
    await controller.queue();
    expect(list).toHaveBeenCalledWith({ page: undefined, pageSize: undefined });
  });

  it('queue() is gated by ALL_MANAGER_ROLES via @RequireRoles metadata', () => {
    const handler = (ProposalsController.prototype as unknown as Record<string, unknown>).queue;
    const meta = Reflect.getMetadata(REQUIRED_ROLES_KEY, handler as object);
    expect(meta).toBeDefined();
    const roles = Array.isArray(meta) ? meta : [meta];
    for (const role of ALL_MANAGER_ROLES) {
      expect(roles).toContain(role);
    }
    // The "employee" role must not be present — this is a manager-side queue.
    expect(roles).not.toContain('employee');
  });
});
