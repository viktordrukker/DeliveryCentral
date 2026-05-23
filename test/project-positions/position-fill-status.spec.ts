import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

import {
  availableFillTransitionsFor,
  findFillTransition,
  InvalidPositionFillTransitionError,
  isValidFillTransition,
  mapLegacyAssignmentStatus,
  POSITION_AMENDABLE_STATUSES,
  POSITION_FILL_STATUS_TRANSITIONS,
  POSITION_FILL_STATUS_VALUES,
  PositionFillStatus,
  PositionFillStatusValue,
  requiresReason,
  TERMINAL_POSITION_FILL_STATUSES,
} from '@src/modules/project-positions/domain/value-objects/position-fill-status';

import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import { PositionId } from '@src/modules/project-positions/domain/value-objects/position-id';

function makePosition(status: PositionFillStatusValue): ProjectPosition {
  return ProjectPosition.create(
    {
      projectId: '11111111-1111-1111-1111-111111111111',
      role: 'Engineer',
      requiredAllocationPercent: 50,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      fillStatus: PositionFillStatus.from(status),
    },
    PositionId.create(),
  );
}

describe('PositionFillStatus value object', () => {
  it('exposes 8 statuses (DRAFT → OPEN → PROPOSED → BOOKED → ONBOARDING → ASSIGNED → ON_HOLD → RELEASED)', () => {
    expect(POSITION_FILL_STATUS_VALUES).toEqual([
      'DRAFT',
      'OPEN',
      'PROPOSED',
      'BOOKED',
      'ONBOARDING',
      'ASSIGNED',
      'ON_HOLD',
      'RELEASED',
    ]);
  });

  it('exposes a transitions table for every status', () => {
    expect(Object.keys(POSITION_FILL_STATUS_TRANSITIONS).sort()).toEqual(
      [...POSITION_FILL_STATUS_VALUES].sort(),
    );
  });

  it('only RELEASED is terminal', () => {
    expect([...TERMINAL_POSITION_FILL_STATUSES]).toEqual(['RELEASED']);
    expect(PositionFillStatus.from('RELEASED').isTerminal()).toBe(true);
    expect(PositionFillStatus.from('ASSIGNED').isTerminal()).toBe(false);
    expect(PositionFillStatus.from('ON_HOLD').isTerminal()).toBe(false);
  });

  it('marks BOOKED/ONBOARDING/ASSIGNED/ON_HOLD as active (someone is engaged on the position)', () => {
    expect(PositionFillStatus.from('BOOKED').isActive()).toBe(true);
    expect(PositionFillStatus.from('ONBOARDING').isActive()).toBe(true);
    expect(PositionFillStatus.from('ASSIGNED').isActive()).toBe(true);
    expect(PositionFillStatus.from('ON_HOLD').isActive()).toBe(true);
    // Not active:
    expect(PositionFillStatus.from('DRAFT').isActive()).toBe(false);
    expect(PositionFillStatus.from('OPEN').isActive()).toBe(false);
    expect(PositionFillStatus.from('PROPOSED').isActive()).toBe(false);
    expect(PositionFillStatus.from('RELEASED').isActive()).toBe(false);
  });

  it('marks OPEN as the only state open to candidate proposal', () => {
    expect(PositionFillStatus.from('OPEN').isOpenForProposal()).toBe(true);
    for (const v of POSITION_FILL_STATUS_VALUES) {
      if (v !== 'OPEN') {
        expect(PositionFillStatus.from(v).isOpenForProposal()).toBe(false);
      }
    }
  });

  it('marks DRAFT/OPEN/PROPOSED/BOOKED/ONBOARDING/ASSIGNED as amendable (RELEASED + ON_HOLD are not)', () => {
    expect(POSITION_AMENDABLE_STATUSES.has('DRAFT')).toBe(true);
    expect(POSITION_AMENDABLE_STATUSES.has('OPEN')).toBe(true);
    expect(POSITION_AMENDABLE_STATUSES.has('PROPOSED')).toBe(true);
    expect(POSITION_AMENDABLE_STATUSES.has('BOOKED')).toBe(true);
    expect(POSITION_AMENDABLE_STATUSES.has('ONBOARDING')).toBe(true);
    expect(POSITION_AMENDABLE_STATUSES.has('ASSIGNED')).toBe(true);
    expect(POSITION_AMENDABLE_STATUSES.has('ON_HOLD')).toBe(false);
    expect(POSITION_AMENDABLE_STATUSES.has('RELEASED')).toBe(false);
  });

  it('every non-terminal state offers a RELEASED escape transition with required reason', () => {
    for (const from of POSITION_FILL_STATUS_VALUES) {
      if (from === 'RELEASED') continue;
      const t = findFillTransition(from, 'RELEASED');
      expect(t).toBeDefined();
      expect(t?.requiresReason).toBe(true);
    }
  });

  it('RELEASED has no outgoing transitions (terminal)', () => {
    expect(POSITION_FILL_STATUS_TRANSITIONS.RELEASED).toEqual([]);
  });
});

describe('Transition role gating', () => {
  it.each([
    ['DRAFT', 'OPEN', ['project_manager', 'delivery_manager', 'director', 'admin']],
    ['OPEN', 'PROPOSED', ['resource_manager', 'delivery_manager']],
    ['PROPOSED', 'BOOKED', ['project_manager', 'delivery_manager', 'director', 'admin']],
    ['BOOKED', 'ONBOARDING', ['project_manager', 'delivery_manager', 'director', 'admin']],
    ['BOOKED', 'ASSIGNED', ['project_manager', 'delivery_manager', 'director', 'admin']],
    ['ONBOARDING', 'ASSIGNED', ['project_manager', 'delivery_manager', 'director', 'admin']],
    ['ONBOARDING', 'ON_HOLD', ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin']],
    ['ASSIGNED', 'ON_HOLD', ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin']],
    ['ON_HOLD', 'ASSIGNED', ['project_manager', 'resource_manager', 'hr_manager', 'director', 'admin']],
  ] satisfies ReadonlyArray<[PositionFillStatusValue, PositionFillStatusValue, PlatformRole[]]>)(
    '%s → %s is allowed for [%s]',
    (from, to, allowed) => {
      for (const role of allowed) {
        expect(isValidFillTransition(from, to, [role])).toBe(true);
      }
    },
  );

  it.each([
    ['OPEN', 'PROPOSED', 'project_manager'], // Only RM/DM can propose
    ['OPEN', 'PROPOSED', 'hr_manager'],
    ['DRAFT', 'OPEN', 'employee'],
    ['ASSIGNED', 'RELEASED', 'employee'],
  ] satisfies ReadonlyArray<[PositionFillStatusValue, PositionFillStatusValue, PlatformRole]>)(
    '%s → %s is denied for role [%s]',
    (from, to, role) => {
      expect(isValidFillTransition(from, to, [role])).toBe(false);
    },
  );

  it('admin can break-glass any defined transition (regardless of per-transition roles)', () => {
    for (const from of POSITION_FILL_STATUS_VALUES) {
      const adminTransitions = availableFillTransitionsFor(from, ['admin']);
      expect(adminTransitions.length).toBe(POSITION_FILL_STATUS_TRANSITIONS[from].length);
    }
  });

  it('availableFillTransitionsFor returns only the transitions the actor can perform', () => {
    expect(availableFillTransitionsFor('OPEN', ['project_manager']).map((t) => t.to)).toEqual([
      'RELEASED',
    ]);
    expect(availableFillTransitionsFor('OPEN', ['resource_manager']).map((t) => t.to).sort()).toEqual(
      ['PROPOSED', 'RELEASED'].sort(),
    );
  });
});

describe('requiresReason()', () => {
  it.each([
    ['DRAFT', 'OPEN', false],
    ['DRAFT', 'RELEASED', true],
    ['OPEN', 'PROPOSED', false],
    ['OPEN', 'RELEASED', true],
    ['PROPOSED', 'BOOKED', false],
    ['PROPOSED', 'OPEN', true], // reject this candidate, position stays open
    ['PROPOSED', 'RELEASED', true],
    ['BOOKED', 'ONBOARDING', false],
    ['BOOKED', 'ASSIGNED', false],
    ['BOOKED', 'RELEASED', true],
    ['ASSIGNED', 'ON_HOLD', true],
    ['ASSIGNED', 'RELEASED', true],
    ['ON_HOLD', 'ASSIGNED', false],
    ['ON_HOLD', 'RELEASED', true],
  ] satisfies ReadonlyArray<[PositionFillStatusValue, PositionFillStatusValue, boolean]>)(
    'requires reason for %s → %s = %s',
    (from, to, expected) => {
      expect(requiresReason(from, to)).toBe(expected);
    },
  );
});

describe('mapLegacyAssignmentStatus()', () => {
  it.each([
    ['DRAFT', 'DRAFT'],
    ['CREATED', 'OPEN'],
    ['PROPOSED', 'PROPOSED'],
    ['IN_REVIEW', 'PROPOSED'],
    ['BOOKED', 'BOOKED'],
    ['ONBOARDING', 'ONBOARDING'],
    ['ASSIGNED', 'ASSIGNED'],
    ['ON_HOLD', 'ON_HOLD'],
    ['REJECTED', 'RELEASED'],
    ['COMPLETED', 'RELEASED'],
    ['CANCELLED', 'RELEASED'],
    // Pre-CSW legacy aliases
    ['REQUESTED', 'PROPOSED'],
    ['APPROVED', 'BOOKED'],
    ['ACTIVE', 'ASSIGNED'],
    ['ENDED', 'RELEASED'],
    ['REVOKED', 'RELEASED'],
    ['ARCHIVED', 'RELEASED'],
    // Unknown → safe default
    ['SOMETHING_ELSE', 'DRAFT'],
  ] satisfies ReadonlyArray<[string, PositionFillStatusValue]>)(
    'maps legacy %s → %s',
    (legacy, expected) => {
      expect(mapLegacyAssignmentStatus(legacy)).toBe(expected);
    },
  );
});

describe('ProjectPosition.transitionFill()', () => {
  it('applies a valid transition and bumps version', () => {
    const pos = makePosition('OPEN');
    const versionBefore = pos.version;
    pos.transitionFill('PROPOSED', {
      actorRoles: ['resource_manager'],
      personId: '22222222-2222-2222-2222-222222222222',
    });
    expect(pos.fillStatus.value).toBe('PROPOSED');
    expect(pos.activePersonId).toBe('22222222-2222-2222-2222-222222222222');
    expect(pos.version).toBe(versionBefore + 1);
  });

  it('rejects an invalid target state', () => {
    const pos = makePosition('OPEN');
    expect(() =>
      pos.transitionFill('ASSIGNED', { actorRoles: ['project_manager'] }),
    ).toThrow(InvalidPositionFillTransitionError);
  });

  it('rejects a transition the actor lacks the role for', () => {
    const pos = makePosition('OPEN');
    expect(() =>
      pos.transitionFill('PROPOSED', {
        actorRoles: ['project_manager'],
        personId: '22222222-2222-2222-2222-222222222222',
      }),
    ).toThrow(InvalidPositionFillTransitionError); // Only RM/DM/admin can propose
  });

  it('rejects a transition that requires reason without one', () => {
    const pos = makePosition('ASSIGNED');
    expect(() =>
      pos.transitionFill('ON_HOLD', { actorRoles: ['hr_manager'] }),
    ).toThrow(/requires a non-empty reason/);
  });

  it('routes reason text to releaseReason on RELEASED', () => {
    const pos = makePosition('ASSIGNED');
    pos.transitionFill('RELEASED', {
      actorRoles: ['project_manager'],
      reason: 'Natural project completion',
    });
    expect(pos.releaseReason).toBe('Natural project completion');
  });

  it('routes reason + caseId to onHoldReason / onHoldCaseId on ON_HOLD', () => {
    const pos = makePosition('ASSIGNED');
    pos.transitionFill('ON_HOLD', {
      actorRoles: ['hr_manager'],
      reason: 'Medical leave',
      caseId: '33333333-3333-3333-3333-333333333333',
    });
    expect(pos.onHoldReason).toBe('Medical leave');
    expect(pos.onHoldCaseId).toBe('33333333-3333-3333-3333-333333333333');
  });

  it('PROPOSED → OPEN with reason rejects the candidate and re-opens the position', () => {
    const pos = makePosition('PROPOSED');
    // First set an active person to simulate the PROPOSED state.
    pos.transitionFill('OPEN', {
      actorRoles: ['project_manager'],
      reason: 'Skill mismatch detected during review',
    });
    expect(pos.fillStatus.value).toBe('OPEN');
    expect(pos.activePersonId).toBeUndefined();
  });

  it('admin can break-glass even when not on the role list', () => {
    const pos = makePosition('OPEN');
    pos.transitionFill('PROPOSED', {
      actorRoles: ['admin'],
      personId: '22222222-2222-2222-2222-222222222222',
    });
    expect(pos.fillStatus.value).toBe('PROPOSED');
  });

  it('snapshot() captures the position state at transition time', () => {
    const pos = makePosition('OPEN');
    pos.transitionFill('PROPOSED', {
      actorRoles: ['resource_manager'],
      personId: '22222222-2222-2222-2222-222222222222',
      allocationPercent: 75,
    });
    const snap = pos.snapshot();
    expect(snap.status).toBe('PROPOSED');
    expect(snap.activePersonId).toBe('22222222-2222-2222-2222-222222222222');
    expect(snap.activeAllocationPercent).toBe(75);
  });

  it('isAmendable() returns true for mid-lifecycle, false for ON_HOLD + RELEASED', () => {
    expect(makePosition('DRAFT').isAmendable()).toBe(true);
    expect(makePosition('OPEN').isAmendable()).toBe(true);
    expect(makePosition('ASSIGNED').isAmendable()).toBe(true);
    expect(makePosition('ON_HOLD').isAmendable()).toBe(false);
    expect(makePosition('RELEASED').isAmendable()).toBe(false);
  });

  it('setUpdatedBy() populates the actor-audit field', () => {
    const pos = makePosition('OPEN');
    pos.setUpdatedBy('99999999-9999-9999-9999-999999999999');
    expect(pos.updatedByPersonId).toBe('99999999-9999-9999-9999-999999999999');
  });
});
