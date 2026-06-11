import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StaffingDeskInlineActions } from './StaffingDeskInlineActions';
import { positionRef, toLeanFillStatus } from '@/features/staffing-desk/staffing-desk.types';
import type { StaffingDeskActions } from '@/features/staffing-desk/useStaffingDeskActions';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';

let mockRoles: string[] = ['delivery_manager'];

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({ principal: { personId: 'actor-1', roles: mockRoles } }),
}));

const fetchPersonDirectory = vi.fn();
vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: (...a: unknown[]) => fetchPersonDirectory(...a),
}));

function makeActions(): StaffingDeskActions {
  return {
    approveAssignment: vi.fn().mockResolvedValue(undefined),
    rejectAssignment: vi.fn().mockResolvedValue(undefined),
    endAssignment: vi.fn().mockResolvedValue(undefined),
    reviewRequest: vi.fn().mockResolvedValue(undefined),
    releaseRequest: vi.fn().mockResolvedValue(undefined),
    cancelRequest: vi.fn().mockResolvedValue(undefined),
  };
}

function makeRow(overrides: Partial<StaffingDeskRow> = {}): StaffingDeskRow {
  return {
    id: 'legacy-row-1',
    positionPublicId: 'pos_abc',
    kind: 'assignment',
    projectId: 'proj-1',
    projectName: 'Project Alpha',
    role: 'Engineer',
    allocationPercent: 100,
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    status: 'PROPOSED',
    statusGroup: 'pending',
    createdAt: '2026-05-01T00:00:00Z',
    personId: 'p-1',
    personName: 'Alice',
    assignmentCode: null,
    personAssignments: [],
    personGrade: null,
    personRole: null,
    personEmail: null,
    personOrgUnit: null,
    personManager: null,
    personPool: null,
    personSkills: [],
    personEmploymentStatus: null,
    priority: null,
    skills: [],
    headcountRequired: null,
    headcountFulfilled: null,
    requestedByName: null,
    summary: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRoles = ['delivery_manager'];
  fetchPersonDirectory.mockResolvedValue({
    items: [{ id: 'person-9', displayName: 'Avery Stone' }],
  });
});

describe('StaffingDeskInlineActions — assignment rows (lean fillStatus)', () => {
  it('renders Approve/Reject on PROPOSED and emits the canonical position id', async () => {
    const actions = makeActions();
    render(<StaffingDeskInlineActions actions={actions} row={makeRow({ status: 'PROPOSED' })} />);

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(actions.approveAssignment).toHaveBeenCalledWith('pos_abc');
  });

  it('Reject collects a required reason and drives PROPOSED→OPEN', async () => {
    const actions = makeActions();
    render(<StaffingDeskInlineActions actions={actions} row={makeRow({ status: 'PROPOSED' })} />);

    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'weak skill match');
    await userEvent.click(confirm);
    expect(actions.rejectAssignment).toHaveBeenCalledWith('pos_abc', 'weak skill match');
  });

  it.each(['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'])(
    'renders End on %s and sends the reason to the release transition',
    async (status) => {
      const actions = makeActions();
      render(<StaffingDeskInlineActions actions={actions} row={makeRow({ status })} />);

      expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'End' }));
      await userEvent.type(screen.getByLabelText('Reason'), 'rolled off');
      await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(actions.endAssignment).toHaveBeenCalledWith('pos_abc', 'rolled off');
    },
  );

  it('falls back to row.id when no positionPublicId was backfilled', async () => {
    const actions = makeActions();
    render(
      <StaffingDeskInlineActions
        actions={actions}
        row={makeRow({ status: 'PROPOSED', positionPublicId: null })}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(actions.approveAssignment).toHaveBeenCalledWith('legacy-row-1');
  });

  it('renders nothing for a RELEASED assignment row', () => {
    const { container } = render(
      <StaffingDeskInlineActions actions={makeActions()} row={makeRow({ status: 'RELEASED' })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('hides Approve/Reject from resource managers (not on the decide edge)', () => {
    mockRoles = ['resource_manager'];
    const { container } = render(
      <StaffingDeskInlineActions actions={makeActions()} row={makeRow({ status: 'PROPOSED' })} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('StaffingDeskInlineActions — request rows (lean fillStatus)', () => {
  it('Propose on OPEN requires picking a candidate and sends personId', async () => {
    mockRoles = ['resource_manager'];
    const actions = makeActions();
    render(
      <StaffingDeskInlineActions actions={actions} row={makeRow({ kind: 'request', status: 'OPEN' })} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Propose' }));
    const confirm = screen.getByRole('button', { name: 'Confirm Proposal' });
    expect(confirm).toBeDisabled();

    await screen.findByRole('option', { name: 'Avery Stone' });
    await userEvent.selectOptions(screen.getByRole('combobox'), 'person-9');
    await userEvent.click(confirm);
    expect(actions.reviewRequest).toHaveBeenCalledWith('pos_abc', 'person-9');
  });

  it('hides Propose from project managers (OPEN→PROPOSED is RM/DM only)', () => {
    mockRoles = ['project_manager'];
    render(
      <StaffingDeskInlineActions
        actions={makeActions()}
        row={makeRow({ kind: 'request', status: 'OPEN' })}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Propose' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('Release on a proposed row (legacy IN_REVIEW) collects a reason for PROPOSED→OPEN', async () => {
    const actions = makeActions();
    render(
      <StaffingDeskInlineActions
        actions={actions}
        row={makeRow({ kind: 'request', status: 'IN_REVIEW' })}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Release' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'candidate declined');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(actions.releaseRequest).toHaveBeenCalledWith('pos_abc', 'candidate declined');
  });

  it('Cancel on a filled row (legacy FULFILLED) collects a reason for →RELEASED', async () => {
    const actions = makeActions();
    render(
      <StaffingDeskInlineActions
        actions={actions}
        row={makeRow({ kind: 'request', status: 'FULFILLED' })}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Propose' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Release' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'descoped');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(actions.cancelRequest).toHaveBeenCalledWith('pos_abc', 'descoped');
  });

  it('renders nothing for a terminal request row (legacy CANCELLED)', () => {
    const { container } = render(
      <StaffingDeskInlineActions
        actions={makeActions()}
        row={makeRow({ kind: 'request', status: 'CANCELLED' })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('lean status helpers', () => {
  it('normalizes legacy desk statuses onto the lean vocabulary', () => {
    expect(toLeanFillStatus('IN_REVIEW')).toBe('PROPOSED');
    expect(toLeanFillStatus('FULFILLED')).toBe('BOOKED');
    expect(toLeanFillStatus('CANCELLED')).toBe('RELEASED');
    expect(toLeanFillStatus('ACTIVE')).toBe('ASSIGNED');
    expect(toLeanFillStatus('REQUESTED')).toBe('PROPOSED');
    expect(toLeanFillStatus('ASSIGNED')).toBe('ASSIGNED');
    expect(toLeanFillStatus('ON_HOLD')).toBe('ON_HOLD');
  });

  it('prefers the backfilled publicId over the legacy row id', () => {
    expect(positionRef(makeRow())).toBe('pos_abc');
    expect(positionRef(makeRow({ positionPublicId: null }))).toBe('legacy-row-1');
  });
});
