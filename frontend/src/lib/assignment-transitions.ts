import type { AssignmentStatusValue } from '@/lib/api/assignments';

export type AssignmentRole =
  | 'employee'
  | 'project_manager'
  | 'resource_manager'
  | 'director'
  | 'hr_manager'
  | 'delivery_manager'
  | 'admin';

export interface AssignmentTransitionRule {
  to: AssignmentStatusValue;
  roles: readonly AssignmentRole[];
  requiresReason?: boolean;
  label: string;
  tone: 'primary' | 'secondary' | 'danger' | 'warning';
}

const BROAD_MGR: AssignmentRole[] = ['project_manager', 'delivery_manager', 'director', 'admin'];
const BROAD_CANCEL: AssignmentRole[] = ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'];
const HOLD_ROLES: AssignmentRole[] = ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin'];

export const ASSIGNMENT_TRANSITIONS: Record<AssignmentStatusValue, readonly AssignmentTransitionRule[]> = {
  CREATED: [
    { to: 'PROPOSED', roles: ['resource_manager', 'delivery_manager', 'admin'], label: 'Propose candidate', tone: 'primary' },
    { to: 'CANCELLED', roles: BROAD_CANCEL, requiresReason: true, label: 'Cancel', tone: 'danger' },
  ],
  PROPOSED: [
    { to: 'BOOKED', roles: BROAD_MGR, label: 'Book', tone: 'primary' },
    { to: 'REJECTED', roles: BROAD_MGR, requiresReason: true, label: 'Reject', tone: 'danger' },
    { to: 'CANCELLED', roles: BROAD_CANCEL, requiresReason: true, label: 'Cancel', tone: 'secondary' },
  ],
  REJECTED: [],
  BOOKED: [
    { to: 'ONBOARDING', roles: BROAD_MGR, label: 'Start onboarding', tone: 'primary' },
    { to: 'ASSIGNED', roles: BROAD_MGR, label: 'Mark as assigned', tone: 'secondary' },
    { to: 'CANCELLED', roles: BROAD_CANCEL, requiresReason: true, label: 'Cancel', tone: 'danger' },
  ],
  ONBOARDING: [
    { to: 'ASSIGNED', roles: BROAD_MGR, label: 'Mark as assigned', tone: 'primary' },
    { to: 'ON_HOLD', roles: HOLD_ROLES, requiresReason: true, label: 'Place on hold', tone: 'warning' },
    { to: 'CANCELLED', roles: BROAD_CANCEL, requiresReason: true, label: 'Cancel', tone: 'danger' },
  ],
  ASSIGNED: [
    { to: 'ON_HOLD', roles: HOLD_ROLES, requiresReason: true, label: 'Place on hold', tone: 'warning' },
    { to: 'COMPLETED', roles: BROAD_MGR, label: 'Mark completed', tone: 'primary' },
    { to: 'CANCELLED', roles: BROAD_CANCEL, requiresReason: true, label: 'Cancel', tone: 'danger' },
  ],
  ON_HOLD: [
    { to: 'ASSIGNED', roles: HOLD_ROLES, label: 'Release (back to assigned)', tone: 'primary' },
    { to: 'CANCELLED', roles: BROAD_CANCEL, requiresReason: true, label: 'Cancel', tone: 'danger' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export function availableTransitions(
  current: string,
  userRoles: readonly string[],
): AssignmentTransitionRule[] {
  const key = current as AssignmentStatusValue;
  const rules = ASSIGNMENT_TRANSITIONS[key];
  if (!rules) return [];
  return rules.filter((rule) => rule.roles.some((role) => userRoles.includes(role)));
}
