/**
 * LEAN-P1-11 — AssignmentsController + StaffingRequestsController
 * backward-compatibility snapshot tests.
 *
 * V2 Master Plan Phase 1 final guard: even though P1-6..P1-10 are
 * rewiring the service layer to write ProjectPosition (+ legacy mirror
 * via the inverted ProjectPositionMirrorService), the public REST
 * surface MUST stay byte-identical because the frontend has not yet
 * migrated.
 *
 * These tests instantiate the controllers with stub services and pin
 * the response-DTO shape of the three most-used endpoints on each
 * controller:
 *  - AssignmentsController:
 *      POST /assignments         (mapAssignmentResponse)
 *      GET  /assignments         (listAssignmentsService passthrough)
 *      GET  /assignments/:id     (getAssignmentByIdService passthrough)
 *  - StaffingRequestsController:
 *      POST /staffing-requests/:id/proposals               (mapSlateResponse)
 *      GET  /staffing-requests/:id/proposals               (mapSlateResponse)
 *      POST /staffing-requests/:id/proposals/:slateId/pick (mapSlateResponse + assignmentId)
 *
 * The intent is a contract pin: any change to the response shape that
 * is not also reflected in this file will fail. If Phase 1 write-path
 * work shifts a field around or drops/renames a key, this test surfaces
 * the regression *before* the frontend consumer breaks.
 */

import { ProjectAssignment } from '@src/modules/assignments/domain/entities/project-assignment.entity';
import { AllocationPercent } from '@src/modules/assignments/domain/value-objects/allocation-percent';
import { AssignmentStatus } from '@src/modules/assignments/domain/value-objects/assignment-status';
import { AssignmentsController } from '@src/modules/assignments/presentation/assignments.controller';
import { StaffingRequestProposalCandidate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-candidate.entity';
import { StaffingRequestProposalSlate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-slate.entity';
import { StaffingRequestsController } from '@src/modules/staffing-requests/presentation/staffing-requests.controller';

// ---------------------------------------------------------------------
// AssignmentsController
// ---------------------------------------------------------------------

function buildAssignmentFixture(): ProjectAssignment {
  return ProjectAssignment.create(
    {
      allocationPercent: AllocationPercent.from(50),
      notes: 'Primary delivery allocation.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      requestedAt: new Date('2025-03-01T00:00:00.000Z'),
      requestedByPersonId: '11111111-1111-1111-1111-111111111006',
      staffingRole: 'Consultant',
      status: AssignmentStatus.from('BOOKED'),
      validFrom: new Date('2025-03-15T00:00:00.000Z'),
      validTo: new Date('2025-04-30T23:59:59.999Z'),
      version: 2,
    },
  );
}

function buildAssignmentsController(
  overrides: Partial<{
    createAssignment: ProjectAssignment;
    getById: unknown;
    list: unknown;
  }> = {},
): AssignmentsController {
  const stub = <T,>(fn: () => Promise<T>) => ({ execute: jest.fn(fn) });

  const createService = stub(async () =>
    overrides.createAssignment ?? buildAssignmentFixture(),
  );
  const getByIdService = stub(async () =>
    overrides.getById ?? {
      id: 'a1111111-1111-1111-1111-111111111111',
      person: {
        id: '11111111-1111-1111-1111-111111111012',
        displayName: 'Ada Lovelace',
      },
      project: {
        id: '33333333-3333-3333-3333-333333333002',
        displayName: 'Apollo Migration',
      },
      staffingRole: 'Consultant',
      allocationPercent: 50,
      startDate: '2025-03-15T00:00:00.000Z',
      endDate: '2025-04-30T23:59:59.999Z',
      approvalState: 'BOOKED',
      version: 2,
      slaStage: null,
      slaDueAt: null,
      slaBreachedAt: null,
      requiresDirectorApproval: false,
      note: 'Primary delivery allocation.',
      requestedAt: '2025-03-01T00:00:00.000Z',
      requestedByPersonId: '11111111-1111-1111-1111-111111111006',
      canApprove: false,
      canReject: false,
      canEnd: true,
      approvals: [],
      history: [],
    },
  );
  const listService = stub(async () =>
    overrides.list ?? {
      items: [
        {
          id: 'a1111111-1111-1111-1111-111111111111',
          person: {
            id: '11111111-1111-1111-1111-111111111012',
            displayName: 'Ada Lovelace',
          },
          project: {
            id: '33333333-3333-3333-3333-333333333002',
            displayName: 'Apollo Migration',
          },
          staffingRole: 'Consultant',
          allocationPercent: 50,
          startDate: '2025-03-15T00:00:00.000Z',
          endDate: '2025-04-30T23:59:59.999Z',
          approvalState: 'BOOKED',
          version: 2,
          slaStage: null,
          slaDueAt: null,
          slaBreachedAt: null,
          requiresDirectorApproval: false,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 25,
    },
  );

  return new AssignmentsController(
    {} as never, // activateApprovedAssignmentsService
    createService as never,
    {} as never, // bulkCreateProjectAssignmentsService
    {} as never, // endProjectAssignmentService
    listService as never,
    getByIdService as never,
    {} as never, // amendProjectAssignmentService
    {} as never, // transitionProjectAssignmentService
    {} as never, // directorApproveService
    {} as never, // scheduleOnboardingService
    {} as never, // approveOnboardingService (LEAN-P4c-1)
  );
}

describe('AssignmentsController — LEAN-P1-11 backward-compat snapshot', () => {
  const ASSIGNMENT_RESPONSE_KEYS = [
    'allocationPercent',
    'endDate',
    'id',
    'note',
    'personId',
    'projectId',
    'requestedAt',
    'staffingRole',
    'startDate',
    'status',
    'version',
  ] as const;

  it('POST /assignments returns the canonical ProjectAssignmentResponseDto shape', async () => {
    const controller = buildAssignmentsController();
    const dto = await controller.createAssignment({
      actorId: '11111111-1111-1111-1111-111111111006',
      allocationPercent: 50,
      endDate: '2025-04-30T23:59:59.999Z',
      note: 'Primary delivery allocation.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      staffingRole: 'Consultant',
      startDate: '2025-03-15T00:00:00.000Z',
    } as never);

    expect(Object.keys(dto).sort()).toEqual([...ASSIGNMENT_RESPONSE_KEYS].sort());
    expect(dto).toEqual({
      allocationPercent: 50,
      endDate: '2025-04-30T23:59:59.999Z',
      id: expect.any(String),
      note: 'Primary delivery allocation.',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      requestedAt: '2025-03-01T00:00:00.000Z',
      staffingRole: 'Consultant',
      startDate: '2025-03-15T00:00:00.000Z',
      status: 'BOOKED',
      version: 2,
    });
    // `undoActionId` is opt-in (only included when populated). Verify
    // the spread does not leak an undefined key.
    expect('undoActionId' in dto).toBe(false);
  });

  it('GET /assignments returns AssignmentDirectoryResponseDto with nested person/project', async () => {
    const controller = buildAssignmentsController();
    const dto = await controller.listAssignments({} as never);

    expect(Object.keys(dto).sort()).toEqual(['items', 'page', 'pageSize', 'totalCount']);
    expect(dto.items[0]).toMatchObject({
      person: { id: expect.any(String), displayName: expect.any(String) },
      project: { id: expect.any(String), displayName: expect.any(String) },
      approvalState: 'BOOKED',
    });
    // Critical: response uses `approvalState` not `status`, and dates are
    // ISO strings. P1 write-path must preserve both.
    expect(typeof dto.items[0].startDate).toBe('string');
    expect(typeof dto.items[0].endDate).toBe('string');
    expect(dto.items[0]).not.toHaveProperty('status');
  });

  it('GET /assignments/:id returns AssignmentDetailsDto with flat personId-free nesting', async () => {
    const controller = buildAssignmentsController();
    const dto = await controller.getAssignmentById('a1111111-1111-1111-1111-111111111111');

    // Details extends DirectoryItem: same nested shape + canApprove/canReject/canEnd/note/history/approvals.
    expect(dto.person).toEqual({
      id: '11111111-1111-1111-1111-111111111012',
      displayName: 'Ada Lovelace',
    });
    expect(dto.project).toEqual({
      id: '33333333-3333-3333-3333-333333333002',
      displayName: 'Apollo Migration',
    });
    expect(dto.approvalState).toBe('BOOKED');
    expect(dto.note).toBe('Primary delivery allocation.');
    expect(dto.canEnd).toBe(true);
    expect(Array.isArray(dto.approvals)).toBe(true);
    expect(Array.isArray(dto.history)).toBe(true);
    // The details DTO must NOT carry a flat `personId`/`projectId`
    // (those collapse into nested person/project objects).
    expect(dto).not.toHaveProperty('personId');
    expect(dto).not.toHaveProperty('projectId');
  });

  it('mapAssignmentResponse() emits undoActionId only when supplied', async () => {
    // Probe the private mapper via a transition flow. The transition service
    // returns `{ assignment, undoActionId }` and the controller passes the
    // second arg into mapAssignmentResponse. We exercise the same private
    // method through createAssignment (undefined) above, and via book/
    // cancel paths the runTransition wrapper passes `result.undoActionId`.
    //
    // For this contract pin, instantiate the controller with a stubbed
    // transition service that returns an undoActionId and assert the
    // resulting DTO carries that field exactly once.
    const stub = <T,>(fn: () => Promise<T>) => ({ execute: jest.fn(fn) });
    const transitionService = stub(async () => ({
      assignment: buildAssignmentFixture(),
      undoActionId: 'undo-action-7',
    }));
    const controller = new AssignmentsController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      transitionService as never,
      {} as never,
      {} as never,
      {} as never, // approveOnboardingService (LEAN-P4c-1)
    );

    const dto = await controller.cancelAssignment(
      'a1111111-1111-1111-1111-111111111111',
      { reason: 'Out of scope.' },
      { principal: { personId: '11111111-1111-1111-1111-111111111006', roles: ['admin'] } },
    );

    expect(dto.undoActionId).toBe('undo-action-7');
    expect(Object.keys(dto).sort()).toEqual(
      [...ASSIGNMENT_RESPONSE_KEYS, 'undoActionId'].sort(),
    );
  });
});

// ---------------------------------------------------------------------
// StaffingRequestsController
// ---------------------------------------------------------------------

function buildSlateFixture(): StaffingRequestProposalSlate {
  const candidate = StaffingRequestProposalCandidate.create({
    availabilityPercent: 100,
    candidatePersonId: '11111111-1111-1111-1111-111111111012',
    matchScore: 88,
    mismatchedSkills: ['Kafka'],
    rank: 1,
    rationale: 'Strong domain fit.',
    slateId: 'slate-1',
  });
  return StaffingRequestProposalSlate.create(
    {
      candidates: [candidate],
      expiresAt: new Date('2025-04-01T00:00:00.000Z'),
      proposedAt: new Date('2025-03-10T00:00:00.000Z'),
      proposedByPersonId: '11111111-1111-1111-1111-111111111007',
      staffingRequestId: 'sr-1',
    },
    'slate-1',
  );
}

function buildStaffingRequestsController(
  overrides: Partial<{
    pickResult: { assignmentId: string; slate: StaffingRequestProposalSlate };
    submitSlate: StaffingRequestProposalSlate;
    findSlate: StaffingRequestProposalSlate | null;
  }> = {},
): StaffingRequestsController {
  const slateService = {
    findByStaffingRequestId: jest.fn(async () =>
      overrides.findSlate === undefined ? buildSlateFixture() : overrides.findSlate,
    ),
    submit: jest.fn(async () => overrides.submitSlate ?? buildSlateFixture()),
    acknowledge: jest.fn(async () => buildSlateFixture()),
    pickCandidate: jest.fn(async () =>
      overrides.pickResult ?? {
        assignmentId: 'a1111111-1111-1111-1111-111111111111',
        slate: buildSlateFixture(),
      },
    ),
    rejectAll: jest.fn(async () => ({
      slate: buildSlateFixture(),
      nextRequestStatus: 'OPEN' as const,
    })),
  };

  return new StaffingRequestsController(
    {} as never, // InMemoryStaffingRequestService
    {} as never, // StaffingSuggestionsService
    {} as never, // DeriveStaffingRequestStatusService
    slateService as never,
    {} as never, // NudgeStaffingRequestService
  );
}

describe('StaffingRequestsController — LEAN-P1-11 backward-compat snapshot', () => {
  const SLATE_RESPONSE_KEYS = [
    'candidates',
    'decidedAt',
    'expiresAt',
    'id',
    'proposedAt',
    'proposedByPersonId',
    'staffingRequestId',
    'status',
  ] as const;

  const CANDIDATE_RESPONSE_KEYS = [
    'availabilityPercent',
    'candidatePersonId',
    'decidedAt',
    'decision',
    'id',
    'matchScore',
    'mismatchedSkills',
    'rank',
    'rationale',
  ] as const;

  it('GET /staffing-requests/:id/proposals returns canonical ProposalSlateResponseDto', async () => {
    const controller = buildStaffingRequestsController();
    const dto = await controller.getProposalSlate('sr-1');

    expect(dto).not.toBeNull();
    expect(Object.keys(dto!).sort()).toEqual([...SLATE_RESPONSE_KEYS].sort());
    expect(dto).toMatchObject({
      id: 'slate-1',
      staffingRequestId: 'sr-1',
      proposedByPersonId: '11111111-1111-1111-1111-111111111007',
      status: 'OPEN',
      proposedAt: '2025-03-10T00:00:00.000Z',
      expiresAt: '2025-04-01T00:00:00.000Z',
    });
    expect(dto!.candidates).toHaveLength(1);
    expect(Object.keys(dto!.candidates[0]).sort()).toEqual([...CANDIDATE_RESPONSE_KEYS].sort());
    expect(dto!.candidates[0]).toEqual({
      id: expect.any(String),
      candidatePersonId: '11111111-1111-1111-1111-111111111012',
      rank: 1,
      matchScore: 88,
      availabilityPercent: 100,
      mismatchedSkills: ['Kafka'],
      rationale: 'Strong domain fit.',
      decision: 'PENDING',
      decidedAt: undefined,
    });
  });

  it('GET /staffing-requests/:id/proposals returns null when no slate exists', async () => {
    const controller = buildStaffingRequestsController({ findSlate: null });
    const dto = await controller.getProposalSlate('sr-empty');
    expect(dto).toBeNull();
  });

  it('POST /staffing-requests/:id/proposals returns canonical ProposalSlateResponseDto', async () => {
    const controller = buildStaffingRequestsController();
    const dto = await controller.submitProposalSlate(
      'sr-1',
      {
        candidates: [
          {
            candidatePersonId: '11111111-1111-1111-1111-111111111012',
            rank: 1,
            matchScore: 88,
            availabilityPercent: 100,
            mismatchedSkills: ['Kafka'],
            rationale: 'Strong domain fit.',
          },
        ],
        expiresAt: '2025-04-01T00:00:00.000Z',
      },
      { principal: { personId: '11111111-1111-1111-1111-111111111007', roles: ['resource_manager'] } },
    );

    expect(Object.keys(dto).sort()).toEqual([...SLATE_RESPONSE_KEYS].sort());
    expect(dto.status).toBe('OPEN');
    expect(dto.candidates[0].decision).toBe('PENDING');
  });

  it('POST /staffing-requests/:id/proposals/:slateId/pick returns { assignmentId, slate } envelope', async () => {
    const controller = buildStaffingRequestsController();
    const dto = await controller.pickProposalCandidate(
      'sr-1',
      'slate-1',
      { candidateId: 'c-1' },
      { principal: { personId: '11111111-1111-1111-1111-111111111006', roles: ['project_manager'] } },
    );

    expect(Object.keys(dto).sort()).toEqual(['assignmentId', 'slate']);
    expect(dto.assignmentId).toBe('a1111111-1111-1111-1111-111111111111');
    expect(Object.keys(dto.slate).sort()).toEqual([...SLATE_RESPONSE_KEYS].sort());
  });
});
