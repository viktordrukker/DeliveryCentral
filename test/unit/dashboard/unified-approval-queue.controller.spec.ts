import { Reflector } from '@nestjs/core';

import { UnifiedApprovalQueueController } from '@src/modules/dashboard/presentation/unified-approval-queue.controller';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { HR_GOVERNANCE_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';

/**
 * V2 defect-fix — HR (diana.walsh) was getting ACCESS DENIED on /approvals.
 * The controller previously gated `list` + `decide` to STAFFING_ROLES only,
 * which excludes `hr_manager`. The unified queue surfaces leave + case
 * approvals (HR-governed), so HR must be allowed in alongside staffing.
 */
describe('UnifiedApprovalQueueController RBAC', () => {
  const reflector = new Reflector();
  const expected = Array.from(
    new Set<string>([...STAFFING_ROLES, ...HR_GOVERNANCE_ROLES]),
  ).sort();

  it('GET /approvals/unified is gated to STAFFING_ROLES ∪ HR_GOVERNANCE_ROLES', () => {
    const roles = reflector.get<readonly string[]>(
      REQUIRED_ROLES_KEY,
      UnifiedApprovalQueueController.prototype.list,
    );
    expect(roles).toBeDefined();
    expect([...roles!].sort()).toEqual(expected);
    expect(roles).toContain('hr_manager');
  });

  it('POST /approvals/:id/decision is gated to STAFFING_ROLES ∪ HR_GOVERNANCE_ROLES', () => {
    const roles = reflector.get<readonly string[]>(
      REQUIRED_ROLES_KEY,
      UnifiedApprovalQueueController.prototype.decide,
    );
    expect(roles).toBeDefined();
    expect([...roles!].sort()).toEqual(expected);
    expect(roles).toContain('hr_manager');
  });
});
