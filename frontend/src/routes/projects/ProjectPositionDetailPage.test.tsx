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

const mockedGet = vi.mocked(getProjectPositionById);
const mockedCandidates = vi.mocked(getPositionCandidates);
const mockedTransition = vi.mocked(transitionProjectPositionFill);
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

function renderAt(search = ''): void {
  render(
    <MemoryRouter initialEntries={[`/projects/prj-1/positions/pos-1${search}`]}>
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
    mockedHistory.mockReset();
    mockedApprovals.mockReset();
    // Defaults — empty history + no pending approvals; tests can override.
    mockedHistory.mockResolvedValue({ positionId: 'pos-1', history: [] });
    mockedApprovals.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 });
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

  it('F-POSITION-NO-CTA: advances a position to the next lifecycle stage via the Quick-actions CTA', async () => {
    mockedGet.mockResolvedValue({ ...OPEN_POSITION, fillStatus: 'DRAFT' as const });
    mockedCandidates.mockResolvedValue({ ...CANDIDATES, candidates: [] });
    mockedTransition.mockResolvedValue({ ...OPEN_POSITION, fillStatus: 'OPEN' as const });

    renderAt();

    const cta = await screen.findByTestId('position-advance-cta');
    expect(cta).toHaveTextContent('Advance to OPEN');

    await userEvent.click(cta);

    await waitFor(() =>
      expect(mockedTransition).toHaveBeenCalledWith('pos-1', expect.objectContaining({ toStatus: 'OPEN' })),
    );
  });

  it('lays out the page as a 2-col canvas: main column + right rail (DS canvas PositionDetail)', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);

    renderAt();
    await screen.findByText('Ada Lovelace');

    // Canvas: 2-col grid wrapper exists.
    expect(screen.getByTestId('position-detail-2col')).toBeInTheDocument();
    // Main column emphasized "Current fill" card.
    expect(screen.getByTestId('position-current-fill')).toBeInTheDocument();
    // Right-rail aside with Quick actions + Linked entities.
    expect(screen.getByTestId('position-right-rail')).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
    // Position spec card with the 2-col DescriptionList grid.
    expect(screen.getByText('Position spec')).toBeInTheDocument();
    // Fill history timeline section.
    expect(screen.getByText('Fill history')).toBeInTheDocument();
  });

  it('shows Confirm + View profile + Reject buttons when a candidate is PROPOSED', async () => {
    mockedGet.mockResolvedValue({
      ...OPEN_POSITION,
      fillStatus: 'PROPOSED' as const,
      activePersonId: 'p-ada',
      activeAllocationPercent: 80,
    });
    // PROPOSED is not in PROPOSABLE — no candidate slate fetch is expected.

    renderAt();

    await waitFor(() => {
      expect(screen.getByTestId('position-current-fill')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Confirm · Book/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /View profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument();
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

  it('PR-20: pre-arms the propose dialog from a ?proposePersonId= deep-link once the slate loads', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);

    renderAt('?proposePersonId=p-ada');

    // The propose dialog opens automatically for the armed candidate — no click.
    expect(await screen.findByText('Propose candidate?')).toBeInTheDocument();
    expect(
      screen.getByText(/Propose Ada Lovelace for "Senior Engineer"/i),
    ).toBeInTheDocument();
  });

  it('PR-20: ignores a ?proposePersonId= that is not in the candidate slate', async () => {
    mockedGet.mockResolvedValue(OPEN_POSITION);
    mockedCandidates.mockResolvedValue(CANDIDATES);

    renderAt('?proposePersonId=p-ghost');

    await screen.findByText('Ada Lovelace');
    expect(screen.queryByText('Propose candidate?')).not.toBeInTheDocument();
  });

  it('shows an empty-state instead of candidates when the position is not seeking a fill', async () => {
    mockedGet.mockResolvedValue({ ...OPEN_POSITION, fillStatus: 'ASSIGNED', activePersonId: 'p-ada' });

    renderAt();

    expect(await screen.findByText('Position not seeking a fill')).toBeInTheDocument();
    expect(mockedCandidates).not.toHaveBeenCalled();
  });
});

describe('ProjectPositionDetailPage history + approvals (W2-04)', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedCandidates.mockReset();
    mockedTransition.mockReset();
    mockedHistory.mockReset();
    mockedApprovals.mockReset();
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
          targetPublicId: 'pos_apolloSeniorEng',
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
          targetPublicId: 'pos_otherRole',
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
