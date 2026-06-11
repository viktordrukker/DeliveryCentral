import { Reflector } from '@nestjs/core';

import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { isValidFillTransition } from '@src/modules/project-positions/domain/value-objects/position-fill-status';
import { ProjectPositionsController } from '@src/modules/project-positions/presentation/project-positions.controller';
import { HR_GOVERNANCE_ROLES, STAFFING_ROLES } from '@src/shared/auth/role-presets';

/**
 * RBAC alignment for position create/transition (Decision B).
 *
 * - `POST /project-positions` previously used PROJECT_DELIVERY_ROLES, which
 *   excludes resource_manager — yet every FE create surface
 *   (`/staffing-desk/positions/new`, `/staffing-requests/new|bulk`) is offered
 *   to STAFFING_DESK_ROLES (includes RM), so RM hit a 403 at submit.
 * - `POST /project-positions/:id/transition` previously used STAFFING_ROLES,
 *   which excludes hr_manager — yet the entity matrix grants HR the ON_HOLD
 *   edges via HOLD_ROLES, so the matrix-granted edge was unreachable.
 *
 * Mirror of `frontend/src/app/route-manifest.ts` — keep in sync with the
 * matching contract block in `route-manifest.test.tsx`:
 *   STAFFING_DESK_ROLES = ['resource_manager', 'project_manager',
 *                          'delivery_manager', 'director', 'admin']
 */
const FE_STAFFING_DESK_ROLES = [
  'resource_manager',
  'project_manager',
  'delivery_manager',
  'director',
  'admin',
] as const;

describe('ProjectPositionsController RBAC gates', () => {
  const reflector = new Reflector();

  function gateOf(method: 'create' | 'transition'): readonly string[] {
    const roles = reflector.get<readonly string[]>(
      REQUIRED_ROLES_KEY,
      ProjectPositionsController.prototype[method],
    );
    expect(roles).toBeDefined();
    return roles!;
  }

  it('POST /project-positions is gated to the STAFFING_ROLES preset (includes resource_manager)', () => {
    const roles = gateOf('create');
    expect([...roles].sort()).toEqual([...STAFFING_ROLES].sort());
    expect(roles).toContain('resource_manager');
  });

  it('create gate matches the FE route-manifest STAFFING_DESK_ROLES surface', () => {
    expect([...gateOf('create')].sort()).toEqual([...FE_STAFFING_DESK_ROLES].sort());
  });

  it('POST /project-positions/:id/transition is gated to STAFFING_ROLES ∪ HR_GOVERNANCE_ROLES', () => {
    const expected = Array.from(new Set([...STAFFING_ROLES, ...HR_GOVERNANCE_ROLES])).sort();
    const roles = gateOf('transition');
    expect([...roles].sort()).toEqual(expected);
    expect(roles).toContain('hr_manager');
  });

  it('gate widening does not bypass the entity matrix — HR can ON_HOLD but cannot BOOK', () => {
    expect(isValidFillTransition('ONBOARDING', 'ON_HOLD', ['hr_manager'])).toBe(true);
    expect(isValidFillTransition('ASSIGNED', 'ON_HOLD', ['hr_manager'])).toBe(true);
    expect(isValidFillTransition('ON_HOLD', 'ASSIGNED', ['hr_manager'])).toBe(true);
    expect(isValidFillTransition('PROPOSED', 'BOOKED', ['hr_manager'])).toBe(false);
    expect(isValidFillTransition('OPEN', 'PROPOSED', ['hr_manager'])).toBe(false);
  });
});
