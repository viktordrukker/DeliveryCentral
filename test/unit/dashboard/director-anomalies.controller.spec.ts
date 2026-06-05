import { Reflector } from '@nestjs/core';

import { DirectorAnomaliesController } from '@src/modules/dashboard/presentation/director-anomalies.controller';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { EXEC_ROLES, HR_GOVERNANCE_ROLES } from '@src/shared/auth/role-presets';

/**
 * LEAN-P4-missing-5 — verifies the new `org-health` endpoint sits behind the
 * director-+-HR-governance role set, and that pre-existing endpoints remain
 * director-only.
 */
describe('DirectorAnomaliesController RBAC', () => {
  const reflector = new Reflector();

  it('org-health is gated to director+admin+HR roles', () => {
    const roles = reflector.get<readonly string[]>(
      REQUIRED_ROLES_KEY,
      DirectorAnomaliesController.prototype.orgHealth,
    );
    expect(roles).toBeDefined();
    const expected = Array.from(
      new Set<string>([...EXEC_ROLES, ...HR_GOVERNANCE_ROLES]),
    ).sort();
    expect([...roles!].sort()).toEqual(expected);
  });

  it('legacy anomalies + finance endpoints stay director-only', () => {
    const anomalyRoles = reflector.get<readonly string[]>(
      REQUIRED_ROLES_KEY,
      DirectorAnomaliesController.prototype.list,
    );
    const financeRoles = reflector.get<readonly string[]>(
      REQUIRED_ROLES_KEY,
      DirectorAnomaliesController.prototype.finance,
    );
    expect([...anomalyRoles!].sort()).toEqual([...EXEC_ROLES].sort());
    expect([...financeRoles!].sort()).toEqual([...EXEC_ROLES].sort());
  });

  it('org-health delegates straight to OrgHealthService.execute', async () => {
    const calls: Array<string | undefined> = [];
    const service = {
      execute: async (asOf?: string) => {
        calls.push(asOf);
        return {
          asOf: asOf ?? new Date().toISOString(),
          totalHeadcount: 0,
          totalBenchSize: 0,
          portfolioUnfillRatePct: 0,
          units: [],
        };
      },
    };
    const controller = new DirectorAnomaliesController(
      {} as never,
      {} as never,
      service as never,
      {} as never, // benchAgingService (LEAN-P4b-3)
    );
    const out = await controller.orgHealth('2026-06-05T00:00:00.000Z');
    expect(calls).toEqual(['2026-06-05T00:00:00.000Z']);
    expect(out.units).toEqual([]);
  });
});
