import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { ValueObject } from '@src/shared/domain/value-object';

/**
 * Sprint 2 / S2-2 — lean staffing aggregate fill-status state machine.
 *
 * Collapses the legacy 11-state AssignmentStatus (DRAFT/CREATED/PROPOSED/
 * IN_REVIEW/REJECTED/BOOKED/ONBOARDING/ASSIGNED/ON_HOLD/COMPLETED/CANCELLED)
 * into an 8-state lifecycle on `ProjectPosition.fillStatus`. The terminal
 * `RELEASED` state absorbs REJECTED/COMPLETED/CANCELLED — the *reason* lives
 * in `position.releaseReason` / `rejectionReason` / `cancellationReason`.
 *
 * See docs/planning/claude-design/lean-simplification-initiative.md §2.
 */
export type PositionFillStatusValue =
  | 'DRAFT'
  | 'OPEN'
  | 'PROPOSED'
  | 'BOOKED'
  | 'ONBOARDING'
  | 'ASSIGNED'
  | 'ON_HOLD'
  | 'RELEASED';

export const POSITION_FILL_STATUS_VALUES: readonly PositionFillStatusValue[] = [
  'DRAFT',
  'OPEN',
  'PROPOSED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'ON_HOLD',
  'RELEASED',
] as const;

export const TERMINAL_POSITION_FILL_STATUSES: ReadonlySet<PositionFillStatusValue> = new Set([
  'RELEASED',
]);

export interface PositionFillTransition {
  to: PositionFillStatusValue;
  roles: readonly PlatformRole[];
  requiresReason?: boolean;
}

// Role groups (kept inline so the matrix reads at a glance).
const PM_DM_DIRECTOR_ADMIN: readonly PlatformRole[] = [
  'project_manager',
  'delivery_manager',
  'director',
  'admin',
];

const PM_DM_DIRECTOR_RM_ADMIN: readonly PlatformRole[] = [
  'project_manager',
  'delivery_manager',
  'director',
  'resource_manager',
  'admin',
];

const RM_DM: readonly PlatformRole[] = ['resource_manager', 'delivery_manager'];

// HR may put a person on hold (illness, leave, dispute) — same as the legacy ON_HOLD transition.
const HOLD_ROLES: readonly PlatformRole[] = [
  'project_manager',
  'resource_manager',
  'hr_manager',
  'director',
  'admin',
];

/**
 * Transition matrix. Source → list of allowed destinations with role gates.
 *
 * Conventions:
 *  - Any state can be transitioned to `RELEASED` with a reason (broad termination path).
 *  - `RELEASED` is terminal (no outgoing transitions).
 *  - `requiresReason: true` enforces non-empty reason text at the service layer.
 *  - Admin can break-glass any transition (added by `availableTransitionsFor` even if not listed).
 */
export const POSITION_FILL_STATUS_TRANSITIONS: Record<
  PositionFillStatusValue,
  readonly PositionFillTransition[]
> = {
  DRAFT: [
    { to: 'OPEN', roles: PM_DM_DIRECTOR_ADMIN },
    { to: 'RELEASED', roles: PM_DM_DIRECTOR_RM_ADMIN, requiresReason: true },
  ],
  OPEN: [
    { to: 'PROPOSED', roles: RM_DM },
    { to: 'RELEASED', roles: PM_DM_DIRECTOR_RM_ADMIN, requiresReason: true },
  ],
  PROPOSED: [
    { to: 'BOOKED', roles: PM_DM_DIRECTOR_ADMIN },
    { to: 'OPEN', roles: PM_DM_DIRECTOR_ADMIN, requiresReason: true }, // reject this candidate, position stays open
    { to: 'RELEASED', roles: PM_DM_DIRECTOR_RM_ADMIN, requiresReason: true },
  ],
  BOOKED: [
    { to: 'ONBOARDING', roles: PM_DM_DIRECTOR_ADMIN },
    { to: 'ASSIGNED', roles: PM_DM_DIRECTOR_ADMIN },
    { to: 'RELEASED', roles: PM_DM_DIRECTOR_RM_ADMIN, requiresReason: true },
  ],
  ONBOARDING: [
    { to: 'ASSIGNED', roles: PM_DM_DIRECTOR_ADMIN },
    { to: 'ON_HOLD', roles: HOLD_ROLES, requiresReason: true },
    { to: 'RELEASED', roles: PM_DM_DIRECTOR_RM_ADMIN, requiresReason: true },
  ],
  ASSIGNED: [
    { to: 'ON_HOLD', roles: HOLD_ROLES, requiresReason: true },
    { to: 'RELEASED', roles: PM_DM_DIRECTOR_RM_ADMIN, requiresReason: true }, // natural completion OR cancel — reason text disambiguates
  ],
  ON_HOLD: [
    { to: 'ASSIGNED', roles: HOLD_ROLES },
    { to: 'RELEASED', roles: PM_DM_DIRECTOR_RM_ADMIN, requiresReason: true },
  ],
  RELEASED: [],
};

export const POSITION_OPEN_ROLES: readonly PlatformRole[] = [
  'project_manager',
  'delivery_manager',
  'director',
  'admin',
];

export const POSITION_AMENDABLE_STATUSES: ReadonlySet<PositionFillStatusValue> = new Set([
  'DRAFT',
  'OPEN',
  'PROPOSED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
]);

export function findFillTransition(
  from: PositionFillStatusValue,
  to: PositionFillStatusValue,
): PositionFillTransition | undefined {
  return POSITION_FILL_STATUS_TRANSITIONS[from].find((transition) => transition.to === to);
}

/**
 * Returns every transition from `from` the given actor is permitted to perform.
 * Admin sees all transitions (break-glass), regardless of the per-transition roles list.
 */
export function availableFillTransitionsFor(
  from: PositionFillStatusValue,
  actorRoles: readonly PlatformRole[],
): PositionFillTransition[] {
  const isAdmin = actorRoles.includes('admin');
  return POSITION_FILL_STATUS_TRANSITIONS[from].filter(
    (transition) => isAdmin || transition.roles.some((role) => actorRoles.includes(role)),
  );
}

export function isValidFillTransition(
  from: PositionFillStatusValue,
  to: PositionFillStatusValue,
  actorRoles: readonly PlatformRole[],
): boolean {
  return availableFillTransitionsFor(from, actorRoles).some((transition) => transition.to === to);
}

export function requiresReason(from: PositionFillStatusValue, to: PositionFillStatusValue): boolean {
  return findFillTransition(from, to)?.requiresReason === true;
}

/**
 * Maps a lean `PositionFillStatusValue` value back to its closest legacy
 * `AssignmentStatus` representation. Used by the LEAN-P0-4 inverted mirror
 * (legacy follower) to keep paired `ProjectAssignment` rows readable for the
 * remaining legacy callsites until the Phase 3 contract migration drops them.
 *
 * `RELEASED` is the lossy direction — the lean model collapsed
 * REJECTED/COMPLETED/CANCELLED into a single terminal state with reason text
 * disambiguation. The follower maps `RELEASED` → `CANCELLED` because that is
 * the broadest legacy terminal status and any legacy reader that consumes the
 * underlying reason column still sees the right semantics.
 */
export function mapPositionFillStatusToLegacy(value: PositionFillStatusValue): string {
  switch (value) {
    case 'DRAFT':
      return 'DRAFT';
    case 'OPEN':
      return 'CREATED';
    case 'PROPOSED':
      return 'PROPOSED';
    case 'BOOKED':
      return 'BOOKED';
    case 'ONBOARDING':
      return 'ONBOARDING';
    case 'ASSIGNED':
      return 'ASSIGNED';
    case 'ON_HOLD':
      return 'ON_HOLD';
    case 'RELEASED':
      return 'CANCELLED';
  }
}

/**
 * Maps a legacy `AssignmentStatus` value to its lean `PositionFillStatusValue` equivalent.
 * Used by the S2-5 backfill script to translate existing rows.
 */
export function mapLegacyAssignmentStatus(legacy: string): PositionFillStatusValue {
  switch (legacy) {
    case 'DRAFT':
      return 'DRAFT';
    case 'CREATED':
      return 'OPEN'; // legacy "created" = ready to look for candidates
    case 'PROPOSED':
    case 'IN_REVIEW':
      return 'PROPOSED';
    case 'REJECTED':
    case 'COMPLETED':
    case 'CANCELLED':
      return 'RELEASED';
    case 'BOOKED':
      return 'BOOKED';
    case 'ONBOARDING':
      return 'ONBOARDING';
    case 'ASSIGNED':
      return 'ASSIGNED';
    case 'ON_HOLD':
      return 'ON_HOLD';
    // Old legacy values pre-CSW.
    case 'REQUESTED':
      return 'PROPOSED';
    case 'APPROVED':
      return 'BOOKED';
    case 'ACTIVE':
      return 'ASSIGNED';
    case 'ENDED':
    case 'REVOKED':
    case 'ARCHIVED':
      return 'RELEASED';
    default:
      return 'DRAFT';
  }
}

export class InvalidPositionFillTransitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidPositionFillTransitionError';
  }
}

export class PositionFillStatus extends ValueObject<{ value: PositionFillStatusValue }> {
  public static from(value: PositionFillStatusValue): PositionFillStatus {
    return new PositionFillStatus({ value });
  }

  public static draft(): PositionFillStatus {
    return new PositionFillStatus({ value: 'DRAFT' });
  }

  public static open(): PositionFillStatus {
    return new PositionFillStatus({ value: 'OPEN' });
  }

  public static proposed(): PositionFillStatus {
    return new PositionFillStatus({ value: 'PROPOSED' });
  }

  public static booked(): PositionFillStatus {
    return new PositionFillStatus({ value: 'BOOKED' });
  }

  public static onboarding(): PositionFillStatus {
    return new PositionFillStatus({ value: 'ONBOARDING' });
  }

  public static assigned(): PositionFillStatus {
    return new PositionFillStatus({ value: 'ASSIGNED' });
  }

  public static onHold(): PositionFillStatus {
    return new PositionFillStatus({ value: 'ON_HOLD' });
  }

  public static released(): PositionFillStatus {
    return new PositionFillStatus({ value: 'RELEASED' });
  }

  public get value(): PositionFillStatusValue {
    return this.props.value;
  }

  public isTerminal(): boolean {
    return TERMINAL_POSITION_FILL_STATUSES.has(this.props.value);
  }

  public isActive(): boolean {
    // Position has someone actively engaged in BOOKED/ONBOARDING/ASSIGNED/ON_HOLD.
    return ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(this.props.value);
  }

  public isOpenForProposal(): boolean {
    return this.props.value === 'OPEN';
  }
}
