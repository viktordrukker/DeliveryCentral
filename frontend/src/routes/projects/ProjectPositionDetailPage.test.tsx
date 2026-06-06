import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
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
