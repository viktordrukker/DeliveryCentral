import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  getPositionCandidates,
  getProjectPositionById,
  transitionProjectPositionFill,
} from '@/lib/api/project-positions';
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
}));

const mockedGet = vi.mocked(getProjectPositionById);
const mockedCandidates = vi.mocked(getPositionCandidates);
const mockedTransition = vi.mocked(transitionProjectPositionFill);

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
