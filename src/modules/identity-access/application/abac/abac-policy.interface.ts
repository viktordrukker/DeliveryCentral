export type AbacAction = 'read' | 'create' | 'update' | 'delete' | 'approve';
export type AbacResource = 'assignment' | 'project' | 'person' | 'case' | 'timesheet' | 'report';

export interface AbacPrincipal {
  personId?: string;
  roles: string[];
  managedPoolIds?: string[];
  managedProjectIds?: string[];
}

/**
 * A data filter narrows a Prisma `where` clause based on the principal.
 * Returns a partial `where` object to be merged into the base query.
 */
export type AbacDataFilter = (principal: AbacPrincipal) => Record<string, unknown>;

export interface AbacPolicy {
  id: string;
  roles: string[];
  resource: AbacResource;
  action: AbacAction;
  description: string;
  /** Optional data filter — undefined means no additional restriction */
  dataFilter?: AbacDataFilter;
}
