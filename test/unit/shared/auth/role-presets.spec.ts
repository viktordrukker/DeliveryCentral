import {
  ALL_AUTHENTICATED_ROLES,
  ALL_MANAGER_ROLES,
  BUDGET_DECIDE_ROLES,
  BUDGET_REQUEST_ROLES,
  BUDGET_ROLES,
  DELIVERY_EXEC_ROLES,
  EXEC_ROLES,
  HR_GOVERNANCE_ROLES,
  PROJECT_DELIVERY_ROLES,
  RM_EXEC_ROLES,
  STAFFING_ROLES,
} from '@src/shared/auth/role-presets';
import { PLATFORM_ROLES } from '@src/modules/identity-access/domain/platform-role';

describe('role-presets (F-5.1 / D-130 step 1)', () => {
  const presets = {
    EXEC_ROLES,
    HR_GOVERNANCE_ROLES,
    DELIVERY_EXEC_ROLES,
    RM_EXEC_ROLES,
    PROJECT_DELIVERY_ROLES,
    STAFFING_ROLES,
    ALL_MANAGER_ROLES,
    ALL_AUTHENTICATED_ROLES,
    BUDGET_ROLES,
    BUDGET_REQUEST_ROLES,
    BUDGET_DECIDE_ROLES,
  };

  it.each(Object.entries(presets))(
    '%s contains only valid PlatformRole values',
    (_, roles) => {
      for (const role of roles) {
        expect(PLATFORM_ROLES).toContain(role);
      }
    },
  );

  it.each(Object.entries(presets))('%s has no duplicate roles', (_, roles) => {
    expect(new Set(roles).size).toBe(roles.length);
  });

  it('admin is in every governance preset (no implicit grants — admin must always be explicit)', () => {
    expect(EXEC_ROLES).toContain('admin');
    expect(HR_GOVERNANCE_ROLES).toContain('admin');
    expect(DELIVERY_EXEC_ROLES).toContain('admin');
    expect(RM_EXEC_ROLES).toContain('admin');
    expect(PROJECT_DELIVERY_ROLES).toContain('admin');
    expect(STAFFING_ROLES).toContain('admin');
    expect(ALL_MANAGER_ROLES).toContain('admin');
    expect(ALL_AUTHENTICATED_ROLES).toContain('admin');
    expect(BUDGET_ROLES).toContain('admin');
    expect(BUDGET_REQUEST_ROLES).toContain('admin');
    expect(BUDGET_DECIDE_ROLES).toContain('admin');
  });

  it('ALL_AUTHENTICATED_ROLES covers every PlatformRole', () => {
    expect(new Set(ALL_AUTHENTICATED_ROLES)).toEqual(new Set(PLATFORM_ROLES));
  });

  it('ALL_MANAGER_ROLES excludes employee', () => {
    expect(ALL_MANAGER_ROLES).not.toContain('employee');
  });

  it('BUDGET_DECIDE_ROLES is the strictest budget subset', () => {
    for (const role of BUDGET_DECIDE_ROLES) {
      expect(BUDGET_ROLES).toContain(role);
    }
  });
});
