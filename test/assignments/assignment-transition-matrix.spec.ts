import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentId } from '@src/modules/assignments/domain/value-objects/assignment-id';
import {
  ASSIGNMENT_STATUS_TRANSITIONS,
  AssignmentStatus,
  AssignmentStatusValue,
  InvalidAssignmentTransitionError,
  availableTransitionsFor,
  findTransition,
} from '@src/modules/assignments/domain/value-objects/assignment-status';

function makeAssignment(status: AssignmentStatusValue): ProjectAssignment {
  return ProjectAssignment.create(
    {
      allocationPercent: AllocationPercent.from(50),
      personId: '11111111-1111-1111-1111-111111111111',
      projectId: '22222222-2222-2222-2222-222222222222',
      requestedAt: new Date('2026-01-01T00:00:00.000Z'),
      staffingRole: 'Engineer',
      status: AssignmentStatus.from(status),
      validFrom: new Date('2026-01-10T00:00:00.000Z'),
    },
    AssignmentId.create(),
  );
}

const ALL_ROLES: PlatformRole[] = [
  'employee',
  'project_manager',
  'resource_manager',
  'director',
  'hr_manager',
  'delivery_manager',
  'admin',
];

describe('Assignment transition matrix', () => {
  it('exposes the canonical 11 statuses (incl. DRAFT and IN_REVIEW from Workflow Overhaul)', () => {
    expect(Object.keys(ASSIGNMENT_STATUS_TRANSITIONS).sort()).toEqual(
      ['ASSIGNED', 'BOOKED', 'CANCELLED', 'COMPLETED', 'CREATED', 'DRAFT', 'IN_REVIEW', 'ONBOARDING', 'ON_HOLD', 'PROPOSED', 'REJECTED'],
    );
  });

  it('marks rejection, completion, and cancellation as terminal', () => {
    expect(AssignmentStatus.from('REJECTED').isTerminal()).toBe(true);
    expect(AssignmentStatus.from('COMPLETED').isTerminal()).toBe(true);
    expect(AssignmentStatus.from('CANCELLED').isTerminal()).toBe(true);
    expect(AssignmentStatus.from('ASSIGNED').isTerminal()).toBe(false);
  });

  describe.each([
    ['DRAFT', 'CREATED', ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'] satisfies PlatformRole[], false],
    ['CREATED', 'PROPOSED', ['resource_manager', 'delivery_manager'] satisfies PlatformRole[], false],
    ['CREATED', 'CANCELLED', ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'] satisfies PlatformRole[], true],
    ['PROPOSED', 'IN_REVIEW', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['PROPOSED', 'REJECTED', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], true],
    ['PROPOSED', 'BOOKED', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['IN_REVIEW', 'BOOKED', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['IN_REVIEW', 'REJECTED', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], true],
    ['BOOKED', 'ONBOARDING', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['BOOKED', 'ASSIGNED', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['ONBOARDING', 'ASSIGNED', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['ONBOARDING', 'ON_HOLD', ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin'] satisfies PlatformRole[], true],
    ['ASSIGNED', 'ON_HOLD', ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin'] satisfies PlatformRole[], true],
    ['ASSIGNED', 'COMPLETED', ['project_manager', 'delivery_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['ON_HOLD', 'ASSIGNED', ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin'] satisfies PlatformRole[], false],
    ['ON_HOLD', 'CANCELLED', ['project_manager', 'delivery_manager', 'director', 'resource_manager', 'admin'] satisfies PlatformRole[], true],
  ] as const)(
    '%s → %s',
    (from, to, allowedRoles, requiresReason) => {
      it(`is allowed for roles [${allowedRoles.join(', ')}]`, () => {
        const assignment = makeAssignment(from);
        assignment.transitionTo(to, {
          actorRoles: [allowedRoles[0]],
          reason: requiresReason ? 'valid reason' : undefined,
        });
        expect(assignment.status.value).toBe(to);
      });

      it('is rejected for roles not in the allow-list', () => {
        const allowed = allowedRoles as readonly PlatformRole[];
        const disallowedRoles = ALL_ROLES.filter((role) => !allowed.includes(role));
        if (disallowedRoles.length === 0) return;
        const assignment = makeAssignment(from);
        expect(() =>
          assignment.transitionTo(to, {
            actorRoles: [disallowedRoles[0] as PlatformRole],
            reason: requiresReason ? 'valid reason' : undefined,
          }),
        ).toThrow(InvalidAssignmentTransitionError);
      });

      if (requiresReason) {
        it('requires a reason', () => {
          const assignment = makeAssignment(from);
          expect(() =>
            assignment.transitionTo(to, {
              actorRoles: [allowedRoles[0]],
            }),
          ).toThrow(/requires a reason/);
        });
      }
    },
  );

  describe.each([
    ['CREATED', 'BOOKED'],
    ['CREATED', 'ASSIGNED'],
    ['CREATED', 'IN_REVIEW'],
    ['PROPOSED', 'ASSIGNED'],
    ['IN_REVIEW', 'PROPOSED'],
    ['IN_REVIEW', 'ONBOARDING'],
    ['IN_REVIEW', 'ASSIGNED'],
    ['BOOKED', 'PROPOSED'],
    ['BOOKED', 'IN_REVIEW'],
    ['ASSIGNED', 'PROPOSED'],
    ['ASSIGNED', 'IN_REVIEW'],
    ['COMPLETED', 'ASSIGNED'],
    ['REJECTED', 'PROPOSED'],
    ['CANCELLED', 'CREATED'],
  ] as const)('%s → %s is invalid', (from, to) => {
    it('throws an invalid-transition error regardless of role', () => {
      const assignment = makeAssignment(from);
      expect(() =>
        assignment.transitionTo(to, { actorRoles: ['admin'], reason: 'any' }),
      ).toThrow(InvalidAssignmentTransitionError);
    });
  });

  it('availableTransitionsFor filters transitions by actor roles', () => {
    const rmTransitions = availableTransitionsFor('CREATED', ['resource_manager']);
    expect(rmTransitions.map((t) => t.to).sort()).toEqual(['CANCELLED', 'PROPOSED']);

    const employeeTransitions = availableTransitionsFor('PROPOSED', ['employee']);
    expect(employeeTransitions).toEqual([]);
  });

  it('findTransition returns matching transition when valid', () => {
    expect(findTransition('PROPOSED', 'BOOKED')).toMatchObject({
      to: 'BOOKED',
      requiresReason: undefined,
    });
    expect(findTransition('BOOKED', 'PROPOSED')).toBeUndefined();
  });

  describe('Workflow Overhaul entity helpers', () => {
    it('acknowledgeReview() transitions PROPOSED → IN_REVIEW', () => {
      const assignment = makeAssignment('PROPOSED');
      assignment.acknowledgeReview(new Date('2026-04-29T10:00:00.000Z'));
      expect(assignment.status.value).toBe('IN_REVIEW');
    });

    it('acknowledgeReview() throws if assignment is not PROPOSED', () => {
      const assignment = makeAssignment('CREATED');
      expect(() => assignment.acknowledgeReview()).toThrow(InvalidAssignmentTransitionError);
    });

    it('pickCandidate() transitions IN_REVIEW → BOOKED', () => {
      const assignment = makeAssignment('IN_REVIEW');
      const ts = new Date('2026-04-29T10:00:00.000Z');
      assignment.pickCandidate(ts);
      expect(assignment.status.value).toBe('BOOKED');
      expect(assignment.approvedAt).toEqual(ts);
    });

    it('pickCandidate() throws if assignment is not IN_REVIEW', () => {
      const assignment = makeAssignment('CREATED');
      expect(() => assignment.pickCandidate()).toThrow(InvalidAssignmentTransitionError);
    });

    it('IN_REVIEW assignments can still be amended', () => {
      const assignment = makeAssignment('IN_REVIEW');
      expect(() => assignment.amend({ staffingRole: 'Senior Engineer' })).not.toThrow();
      expect(assignment.staffingRole).toBe('Senior Engineer');
    });
  });
});
