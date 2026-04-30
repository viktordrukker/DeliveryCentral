import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { ValueObject } from '@src/shared/domain/value-object';

export type AssignmentStatusValue =
  | 'ASSIGNED'
  | 'BOOKED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'CREATED'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'ONBOARDING'
  | 'ON_HOLD'
  | 'PROPOSED'
  | 'REJECTED';

export const ASSIGNMENT_STATUS_VALUES: readonly AssignmentStatusValue[] = [
  'DRAFT',
  'CREATED',
  'PROPOSED',
  'IN_REVIEW',
  'REJECTED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;

export const TERMINAL_ASSIGNMENT_STATUSES: ReadonlySet<AssignmentStatusValue> = new Set([
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
]);

export interface AssignmentTransition {
  to: AssignmentStatusValue;
  roles: readonly PlatformRole[];
  requiresReason?: boolean;
}

export const ASSIGNMENT_STATUS_TRANSITIONS: Record<AssignmentStatusValue, readonly AssignmentTransition[]> = {
  DRAFT: [
    { to: 'CREATED', roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'] },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  CREATED: [
    { to: 'PROPOSED', roles: ['resource_manager', 'delivery_manager'] },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  PROPOSED: [
    { to: 'IN_REVIEW', roles: ['project_manager', 'delivery_manager', 'director', 'admin'] },
    {
      to: 'REJECTED',
      roles: ['project_manager', 'delivery_manager', 'director', 'admin'],
      requiresReason: true,
    },
    { to: 'BOOKED', roles: ['project_manager', 'delivery_manager', 'director', 'admin'] },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  IN_REVIEW: [
    { to: 'BOOKED', roles: ['project_manager', 'delivery_manager', 'director', 'admin'] },
    {
      to: 'REJECTED',
      roles: ['project_manager', 'delivery_manager', 'director', 'admin'],
      requiresReason: true,
    },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  REJECTED: [],
  BOOKED: [
    { to: 'ONBOARDING', roles: ['project_manager', 'delivery_manager', 'director', 'admin'] },
    { to: 'ASSIGNED', roles: ['project_manager', 'delivery_manager', 'director', 'admin'] },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  ONBOARDING: [
    { to: 'ASSIGNED', roles: ['project_manager', 'delivery_manager', 'director', 'admin'] },
    {
      to: 'ON_HOLD',
      roles: ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin'],
      requiresReason: true,
    },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  ASSIGNED: [
    {
      to: 'ON_HOLD',
      roles: ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin'],
      requiresReason: true,
    },
    { to: 'COMPLETED', roles: ['project_manager', 'delivery_manager', 'director', 'admin'] },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  ON_HOLD: [
    {
      to: 'ASSIGNED',
      roles: ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin'],
    },
    {
      to: 'CANCELLED',
      roles: ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'],
      requiresReason: true,
    },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export const ASSIGNMENT_CREATE_ROLES: readonly PlatformRole[] = [
  'project_manager',
  'delivery_manager',
  'director',
  'admin',
];

export const ASSIGNMENT_AMEND_SOURCE_STATUSES: ReadonlySet<AssignmentStatusValue> = new Set([
  'CREATED',
  'PROPOSED',
  'IN_REVIEW',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
]);

export function findTransition(
  from: AssignmentStatusValue,
  to: AssignmentStatusValue,
): AssignmentTransition | undefined {
  return ASSIGNMENT_STATUS_TRANSITIONS[from].find((transition) => transition.to === to);
}

export function availableTransitionsFor(
  from: AssignmentStatusValue,
  actorRoles: readonly PlatformRole[],
): AssignmentTransition[] {
  return ASSIGNMENT_STATUS_TRANSITIONS[from].filter((transition) =>
    transition.roles.some((role) => actorRoles.includes(role)),
  );
}

export class InvalidAssignmentTransitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidAssignmentTransitionError';
  }
}

export class AssignmentStatus extends ValueObject<{ value: AssignmentStatusValue }> {
  public static from(value: AssignmentStatusValue): AssignmentStatus {
    return new AssignmentStatus({ value });
  }

  public static fromLegacy(value: string): AssignmentStatus {
    switch (value) {
      case 'DRAFT':
      case 'CREATED':
      case 'PROPOSED':
      case 'IN_REVIEW':
      case 'REJECTED':
      case 'BOOKED':
      case 'ONBOARDING':
      case 'ASSIGNED':
      case 'ON_HOLD':
      case 'COMPLETED':
      case 'CANCELLED':
        return AssignmentStatus.from(value as AssignmentStatusValue);
      case 'REQUESTED':
        return AssignmentStatus.created();
      case 'APPROVED':
        return AssignmentStatus.booked();
      case 'ACTIVE':
        return AssignmentStatus.assigned();
      case 'ENDED':
        return AssignmentStatus.completed();
      case 'REVOKED':
      case 'ARCHIVED':
        return AssignmentStatus.cancelled();
      default:
        return AssignmentStatus.created();
    }
  }

  public static draft(): AssignmentStatus {
    return new AssignmentStatus({ value: 'DRAFT' });
  }

  public static created(): AssignmentStatus {
    return new AssignmentStatus({ value: 'CREATED' });
  }

  public static proposed(): AssignmentStatus {
    return new AssignmentStatus({ value: 'PROPOSED' });
  }

  public static inReview(): AssignmentStatus {
    return new AssignmentStatus({ value: 'IN_REVIEW' });
  }

  public static rejected(): AssignmentStatus {
    return new AssignmentStatus({ value: 'REJECTED' });
  }

  public static booked(): AssignmentStatus {
    return new AssignmentStatus({ value: 'BOOKED' });
  }

  public static onboarding(): AssignmentStatus {
    return new AssignmentStatus({ value: 'ONBOARDING' });
  }

  public static assigned(): AssignmentStatus {
    return new AssignmentStatus({ value: 'ASSIGNED' });
  }

  public static onHold(): AssignmentStatus {
    return new AssignmentStatus({ value: 'ON_HOLD' });
  }

  public static completed(): AssignmentStatus {
    return new AssignmentStatus({ value: 'COMPLETED' });
  }

  public static cancelled(): AssignmentStatus {
    return new AssignmentStatus({ value: 'CANCELLED' });
  }

  public get value(): AssignmentStatusValue {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return TERMINAL_ASSIGNMENT_STATUSES.has(this.props.value);
  }
}
