import { BadRequestException, Injectable } from '@nestjs/common';

import { DeliveryManagerDashboardQueryService } from './delivery-manager-dashboard-query.service';
import { DirectorDashboardQueryService } from './director-dashboard-query.service';
import { EmployeeDashboardQueryService } from './employee-dashboard-query.service';
import { HrManagerDashboardQueryService } from './hr-manager-dashboard-query.service';
import { ProjectManagerDashboardQueryService } from './project-manager-dashboard-query.service';
import { ResourceManagerDashboardQueryService } from './resource-manager-dashboard-query.service';

import { MeHomeKind, MeHomeResponseDto } from './contracts/me-home.dto';

/**
 * FE-#314 — role-aware home aggregator for /me workspace shell.
 *
 * Phase E redirects /dashboard/employee, /dashboard/manager,
 * /dashboard/exec all → /me for non-director roles. The WorkspaceShell
 * Overview tab needs role-specific content; this service picks the
 * right per-role dashboard payload based on the caller's top role.
 *
 * Role priority (highest first): director > admin > delivery_manager >
 * project_manager > resource_manager > hr_manager > employee. A person
 * with multiple roles sees the home for their highest role; they can
 * still navigate to any sidebar item their other roles unlock.
 */
@Injectable()
export class MeHomeService {
  public constructor(
    private readonly employee: EmployeeDashboardQueryService,
    private readonly pm: ProjectManagerDashboardQueryService,
    private readonly rm: ResourceManagerDashboardQueryService,
    private readonly dm: DeliveryManagerDashboardQueryService,
    private readonly hr: HrManagerDashboardQueryService,
    private readonly director: DirectorDashboardQueryService,
  ) {}

  public async getHome(
    personId: string | undefined,
    roles: readonly string[],
  ): Promise<MeHomeResponseDto> {
    const homeKind = pickHomeKind(roles);

    // The 4 role-specific dashboards that need personId (PM / RM / HR /
    // Employee) refuse to compute without one. Director + DM are tenant-
    // wide and don't need personId.
    if (
      (homeKind === 'pm' ||
        homeKind === 'rm' ||
        homeKind === 'hr' ||
        homeKind === 'employee') &&
      !personId
    ) {
      throw new BadRequestException(
        'Could not determine personId from request principal for role-specific home.',
      );
    }

    const payload = await this.loadPayload(homeKind, personId ?? '');
    return { homeKind, payload };
  }

  private async loadPayload(kind: MeHomeKind, personId: string): Promise<unknown> {
    switch (kind) {
      case 'director':
      case 'admin':
        // Admin sees the director home — full portfolio view, no role-
        // specific scoping. (Admin gets the everything-everywhere view
        // by default on /me; the dedicated /admin tabs cover the
        // governance surface.)
        return this.director.execute({});
      case 'dm':
        return this.dm.execute({});
      case 'pm':
        return this.pm.execute({ personId });
      case 'rm':
        return this.rm.execute({ personId });
      case 'hr':
        return this.hr.execute({ personId });
      case 'employee':
        return this.employee.execute({ personId });
    }
  }
}

function pickHomeKind(roles: readonly string[]): MeHomeKind {
  if (roles.includes('director')) return 'director';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('delivery_manager')) return 'dm';
  if (roles.includes('project_manager')) return 'pm';
  if (roles.includes('resource_manager')) return 'rm';
  if (roles.includes('hr_manager')) return 'hr';
  return 'employee';
}
