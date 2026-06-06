/**
 * LEAN-P4c-2 + LEAN-P4-missing-3 — ProposalsController unit tests.
 *
 * Covers:
 *   - RBAC: queue is gated by ALL_MANAGER_ROLES (RM/PM/HR/DM/director/admin).
 *   - RBAC: autoMatch is gated by STAFFING_ROLES (RM/PM/DM/director/admin).
 *   - Pagination passthrough: query string page/pageSize parsed to int.
 *   - Default behavior when no query string supplied.
 *   - Auto-match: principal personId → actorId, body topN propagated, UUID
 *     shape validation rejects malformed ids with 400.
 */
import { BadRequestException } from '@nestjs/common';

import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_MANAGER_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';
import { AutoMatchCandidatesService } from '@src/modules/staffing-requests/application/auto-match-candidates.service';
import { ProposalsController } from '@src/modules/staffing-requests/presentation/proposals.controller';
import { UnifiedCandidateQueueService } from '@src/modules/staffing-requests/application/unified-candidate-queue.service';

function makeFixture() {
  const list = jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 50 });
  const queueService = { list } as unknown as UnifiedCandidateQueueService;
  const execute = jest.fn().mockResolvedValue({
    positionId: '11111111-1111-1111-1111-111111111111',
    created: 0,
    candidates: [],
  });
  const autoMatchService = { execute } as unknown as AutoMatchCandidatesService;
  const controller = new ProposalsController(queueService, autoMatchService);
  return { controller, list, execute };
}

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

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

describe('ProposalsController.autoMatch (LEAN-P4-missing-3)', () => {
  it('passes actorId from principal.personId + topN from body to the service', async () => {
    const { controller, execute } = makeFixture();
    await controller.autoMatch(
      VALID_UUID,
      { topN: 7 },
      { principal: { personId: 'pm-1', roles: ['project_manager'], userId: 'u-1' } } as never,
    );
    expect(execute).toHaveBeenCalledWith({
      actorId: 'pm-1',
      positionId: VALID_UUID,
      topN: 7,
    });
  });

  it('falls back to principal.userId when personId is absent', async () => {
    const { controller, execute } = makeFixture();
    await controller.autoMatch(
      VALID_UUID,
      {},
      { principal: { roles: ['admin'], userId: 'u-admin' } } as never,
    );
    expect(execute).toHaveBeenCalledWith({
      actorId: 'u-admin',
      positionId: VALID_UUID,
      topN: undefined,
    });
  });

  it('returns the service result verbatim', async () => {
    const { controller, execute } = makeFixture();
    const expected = {
      positionId: VALID_UUID,
      created: 2,
      candidates: [
        {
          candidateId: 'c1',
          personId: 'p1',
          name: 'Ada',
          rank: 1,
          matchScore: 0.92,
          matchedSkills: ['React'],
          missingSkills: [],
          decision: 'PENDING',
        },
      ],
    };
    execute.mockResolvedValueOnce(expected);
    const out = await controller.autoMatch(
      VALID_UUID,
      { topN: 5 },
      { principal: { personId: 'rm-1', roles: ['resource_manager'], userId: 'u-2' } } as never,
    );
    expect(out).toEqual(expected);
  });

  it('rejects a malformed (non-UUID-shape) positionId with 400', async () => {
    const { controller, execute } = makeFixture();
    await expect(
      controller.autoMatch(
        'not-a-uuid',
        {},
        { principal: { personId: 'rm-1', roles: ['resource_manager'], userId: 'u-2' } } as never,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(execute).not.toHaveBeenCalled();
  });

  it('is gated by STAFFING_ROLES via @RequireRoles metadata', () => {
    const handler = (ProposalsController.prototype as unknown as Record<string, unknown>).autoMatch;
    const meta = Reflect.getMetadata(REQUIRED_ROLES_KEY, handler as object);
    expect(meta).toBeDefined();
    const roles = Array.isArray(meta) ? meta : [meta];
    for (const role of STAFFING_ROLES) {
      expect(roles).toContain(role);
    }
    // The "employee" + "hr_manager" roles must not be present — RM-side action.
    expect(roles).not.toContain('employee');
    expect(roles).not.toContain('hr_manager');
  });
});
