import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchUnifiedApprovals } from '@/lib/api/approvals-unified';
import {
  fetchPositionHistory,
  getPositionCandidates,
  getProjectPositionById,
  transitionProjectPositionFill,
} from '@/lib/api/project-positions';
import { autoMatchPosition } from '@/lib/api/staffing-candidates';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { ProjectPositionDetailPage } from './ProjectPositionDetailPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'rm-1', roles: ['resource_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/project-positions', () => ({
  getProjectPositionById: vi.fn(),
  getPositionCandidates: vi.fn(),
  transitionProjectPositionFill: vi.fn(),
  listProjectPositions: vi.fn().mockResolvedValue({ positions: [], total: 0 }),
  fetchPositionHistory: vi.fn().mockResolvedValue({ positionId: 'pos-1', history: [] }),
}));

vi.mock('@/lib/api/approvals-unified', () => ({
  fetchUnifiedApprovals: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 }),
}));

vi.mock('@/lib/api/staffing-candidates', () => ({
  autoMatchPosition: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: vi.fn(),
}));

const mockedGet = vi.mocked(getProjectPositionById);
const mockedCandidates = vi.mocked(getPositionCandidates);
const mockedTransition = vi.mocked(transitionProjectPositionFill);
const mockedAutoMatch = vi.mocked(autoMatchPosition);
const mockedFlag = vi.mocked(isFeatureEnabled);
const mockedHistory = vi.mocked(fetchPositionHistory);
const mockedApprovals = vi.mocked(fetchUnifiedApprovals);

const OPEN_POSITION = {
  id: 'pos-1',
  projectId: 'prj-1',
  role: 'Senior Engineer',
  requiredAllocationPercent: 80,
  fillStatus: 'OPEN' as const,
  version: 1,
};

const CANDIDATES = {
  positionId: 'pos-1',
  requiredSkills: ['React', 'Node'],
  candidates: [
    {
      personId: 'p-ada',
      name: 'Ada Lovelace',
      role: 'Senior Engineer',
      grade: 'L5',
      matchScore: 0.88,
      matchedSkills: ['React', 'Node'],
      missingSkills: [],
      availabilityHours14d: 80,
    },
    {
      personId: 'p-bo',
      name: 'Bo Diaz',
      role: 'PM',
      grade: 'L4',
      matchScore: 0.4,
      matchedSkills: ['React'],
      missingSkills: ['Node'],
      availabilityHours14d: 80,
    },
  ],
};

function renderAt(): void {
  render(
    <MemoryRouter initialEntries={['/projects/prj-1/positions/pos-1']}>
      <Routes>
        <Route element={<ProjectPositionDetailPage />} path="/projects/:projectId/positions/:positionId" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectPositionDetailPage (NEW-LGL-7)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedCandidates.mockReset();
    mockedTransition.mockReset();
    mockedAutoMatch.mockReset();
    mockedFlag.mockReset();
    mockedHistory.mockReset();
    mockedApprovals.mockReset();
    // Defaults — empty history + no pending approvals; tests can override.
    mockedHistory.mockResolvedValue({ positionId: 'pos-1', history: [] });
    mockedApprovals.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
    // Default: dsRefresh OFF — auto-match button hidden. Per-test overrides enable it.
    mockedFlag.mockReturnValue(false);
  });

  it('renders the position summary and ranked candidates', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);

    renderAt();

    expect((await screen.findAllByText('Senior Engineer')).length).toBeGreaterThan(0);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Bo Diaz')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument(); // Ada's match score
    // Missing skill surfaced for Bo.
    expect(screen.getByText('Node')).toBeInTheDocument();
  });

  it('Propose → confirm → transitions the position to PROPOSED with the candidate', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);
    mockedTransition.mockResolvedValue({ ...OPEN_POSITION, fillStatus: 'PROPOSED', activePersonId: 'p-ada' });
    const user = userEvent.setup();

    renderAt();
    await screen.findByText('Ada Lovelace');

    // Click the first row's "Propose" (only the row buttons exist yet).
    const proposeButtons = screen.getAllByRole('button', { name: 'Propose' });
    await user.click(proposeButtons[0]!);

    // Confirm in the dialog (its confirm button is rendered last).
    const confirmButtons = screen.getAllByRole('button', { name: 'Propose' });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() =>
      expect(mockedTransition).toHaveBeenCalledWith('pos-1', {
        toStatus: 'PROPOSED',
        personId: 'p-ada',
        allocationPercent: 80,
      }),
    );
  });

  it('shows an empty-state instead of candidates when the position is not seeking a fill', async () => {
    mockedGet.mockResolvedValue({ ...OPEN_POSITION, fillStatus: 'ASSIGNED', activePersonId: 'p-ada' });

    renderAt();

    expect(await screen.findByText('Position not seeking a fill')).toBeInTheDocument();
    expect(mockedCandidates).not.toHaveBeenCalled();
  });
});

describe('ProjectPositionDetailPage.AutoMatch (LEAN-P4-missing-3)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedCandidates.mockReset();
    mockedTransition.mockReset();
    mockedAutoMatch.mockReset();
    mockedFlag.mockReset();
    mockedHistory.mockReset();
    mockedApprovals.mockReset();
    mockedHistory.mockResolvedValue({ positionId: 'pos-1', history: [] });
    mockedApprovals.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
  });

  it('hides the Auto-match button when dsRefresh is OFF', async () => {
    mockedFlag.mockReturnValue(false);
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);

    renderAt();
    await screen.findByText('Ada Lovelace');

    expect(screen.queryByTestId('auto-match-button')).not.toBeInTheDocument();
  });

  it('shows the Auto-match button when dsRefresh is ON for an OPEN position', async () => {
    mockedFlag.mockReturnValue(true);
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);

    renderAt();
    await screen.findByText('Ada Lovelace');

    expect(screen.getByTestId('auto-match-button')).toBeInTheDocument();
    expect(screen.getByTestId('auto-match-button')).toHaveTextContent('Auto-match');
  });

  it('clicking Auto-match calls autoMatchPosition + reloads candidates + surfaces a success message', async () => {
    mockedFlag.mockReturnValue(true);
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);
    mockedAutoMatch.mockResolvedValue({
      positionId: 'pos-1',
      created: 3,
      candidates: [
        {
          candidateId: 'cand-1',
          personId: 'p-ada',
          name: 'Ada Lovelace',
          rank: 1,
          matchScore: 0.92,
          matchedSkills: ['React', 'Node'],
          missingSkills: [],
          decision: 'PENDING',
        },
      ],
    });
    const user = userEvent.setup();

    renderAt();
    await screen.findByText('Ada Lovelace');

    const button = screen.getByTestId('auto-match-button');
    await user.click(button);

    await waitFor(() =>
      expect(mockedAutoMatch).toHaveBeenCalledWith('pos-1', { topN: 5 }),
    );
    // Candidates reload after the auto-match call.
    await waitFor(() => expect(mockedCandidates).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('auto-match-message')).toHaveTextContent(
      'Auto-matched 3 candidates into the slate.',
    );
  });

  it('surfaces a friendly message when auto-match returns zero candidates', async () => {
    mockedFlag.mockReturnValue(true);
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);
    mockedAutoMatch.mockResolvedValue({ positionId: 'pos-1', created: 0, candidates: [] });
    const user = userEvent.setup();

    renderAt();
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByTestId('auto-match-button'));

    expect(await screen.findByTestId('auto-match-message')).toHaveTextContent(
      'no candidates meeting the 80% skill floor',
    );
  });

  it('hides the Auto-match button on a non-proposable position even when dsRefresh is ON', async () => {
    mockedFlag.mockReturnValue(true);
    mockedGet.mockResolvedValue({ ...OPEN_POSITION, fillStatus: 'ASSIGNED', activePersonId: 'p-ada' });

    renderAt();
    await screen.findByText('Position not seeking a fill');

    expect(screen.queryByTestId('auto-match-button')).not.toBeInTheDocument();
  });
});

describe('ProjectPositionDetailPage history + approvals (W2-04)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedCandidates.mockReset();
    mockedTransition.mockReset();
    mockedAutoMatch.mockReset();
    mockedFlag.mockReset();
    mockedHistory.mockReset();
    mockedApprovals.mockReset();
    mockedFlag.mockReturnValue(false);
  });

  it('renders the lifecycle history timeline when history rows are present', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);
    mockedApprovals.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
    mockedHistory.mockResolvedValue({
      positionId: 'pos-1',
      history: [
        {
          id: 'h-1',
          positionId: 'pos-1',
          changeType: 'OPENED',
          previousStatus: 'DRAFT',
          newStatus: 'OPEN',
          changedByPersonId: 'rm-1',
          occurredAt: '2026-06-01T10:00:00Z',
        },
      ],
    });

    renderAt();
    await screen.findByText('Ada Lovelace');

    expect(mockedHistory).toHaveBeenCalledWith('pos-1');
    // Timeline mounts (collapsible card body renders the empty wrapper at minimum).
    expect(await screen.findByTestId('assignment-history-timeline')).toBeInTheDocument();
  });

  it('renders pending approvals when fetchUnifiedApprovals returns a matching item', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);
    mockedHistory.mockResolvedValue({ positionId: 'pos-1', history: [] });
    mockedApprovals.mockResolvedValue({
      items: [
        {
          id: 'apv-1',
          source: 'position-proposal',
          title: 'Propose Ada for Senior Engineer',
          submittedBy: { personId: 'rm-1', displayName: 'Sophia Kim' },
          submittedAt: '2026-06-05T12:00:00Z',
          slaDueAt: '2026-06-06T12:00:00Z',
          slaBreachedAt: null,
          slaStage: 'due-soon',
          ageHours: 6,
          href: '/projects/prj-1/positions/pos-1',
          meta: { positionId: 'pos-1' },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    });

    renderAt();
    await screen.findByText('Ada Lovelace');

    expect(await screen.findByText('Propose Ada for Senior Engineer')).toBeInTheDocument();
    expect(screen.getByText('Sophia Kim')).toBeInTheDocument();
    expect(screen.getByText('Due soon')).toBeInTheDocument();
  });

  it('hides approvals from other positions even when the unified queue returns them', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);
    mockedHistory.mockResolvedValue({ positionId: 'pos-1', history: [] });
    mockedApprovals.mockResolvedValue({
      items: [
        {
          id: 'apv-other',
          source: 'position-proposal',
          title: 'Propose Bo for Other Role',
          submittedBy: null,
          submittedAt: '2026-06-05T12:00:00Z',
          slaDueAt: null,
          slaBreachedAt: null,
          slaStage: null,
          ageHours: 1,
          href: '/projects/prj-other/positions/pos-other',
          meta: { positionId: 'pos-other' },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    });

    renderAt();
    await screen.findByText('Ada Lovelace');

    expect(screen.queryByText('Propose Bo for Other Role')).not.toBeInTheDocument();
    expect(await screen.findByText('No pending approvals')).toBeInTheDocument();
  });
});
