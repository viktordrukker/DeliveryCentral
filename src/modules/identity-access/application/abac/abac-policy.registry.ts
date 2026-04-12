import { Injectable } from '@nestjs/common';

import { AbacAction, AbacPolicy, AbacPrincipal, AbacResource } from './abac-policy.interface';

/**
 * Static seed policies covering the default ABAC rules.
 * - resource_manager can approve assignments only within their managed pool.
 * - project_manager can read assignments only for their managed projects.
 */
const SEED_POLICIES: AbacPolicy[] = [
  {
    id: 'rm-approve-assignment-in-pool',
    roles: ['resource_manager'],
    resource: 'assignment',
    action: 'approve',
    description: 'Resource managers may only approve assignments within their managed resource pool.',
    dataFilter: (principal: AbacPrincipal) => ({
      resourcePool: principal.managedPoolIds?.length
        ? { id: { in: principal.managedPoolIds } }
        : {},
    }),
  },
  {
    id: 'pm-read-assignment-in-project',
    roles: ['project_manager'],
    resource: 'assignment',
    action: 'read',
    description: 'Project managers can only read assignments for projects they manage.',
    dataFilter: (principal: AbacPrincipal) => ({
      projectId: principal.managedProjectIds?.length
        ? { in: principal.managedProjectIds }
        : undefined,
    }),
  },
  {
    id: 'employee-read-own-timesheet',
    roles: ['employee'],
    resource: 'timesheet',
    action: 'read',
    description: 'Employees can only read their own timesheets.',
    dataFilter: (principal: AbacPrincipal) => ({
      personId: principal.personId,
    }),
  },
];

@Injectable()
export class AbacPolicyRegistry {
  private readonly policies: Map<string, AbacPolicy> = new Map(
    SEED_POLICIES.map((p) => [p.id, p]),
  );

  public listPolicies(): AbacPolicy[] {
    return Array.from(this.policies.values());
  }

  public getPoliciesFor(roles: string[], resource: AbacResource, action: AbacAction): AbacPolicy[] {
    return Array.from(this.policies.values()).filter(
      (p) =>
        p.resource === resource &&
        p.action === action &&
        p.roles.some((r) => roles.includes(r)),
    );
  }

  public applyDataFilter(
    principal: AbacPrincipal,
    resource: AbacResource,
    action: AbacAction,
    baseWhere: Record<string, unknown>,
  ): Record<string, unknown> {
    const matching = this.getPoliciesFor(principal.roles, resource, action);
    if (matching.length === 0) return baseWhere;

    const merged = { ...baseWhere };
    for (const policy of matching) {
      if (policy.dataFilter) {
        const filter = policy.dataFilter(principal);
        Object.assign(merged, filter);
      }
    }
    return merged;
  }
}
