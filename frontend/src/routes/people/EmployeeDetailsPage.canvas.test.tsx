/**
 * SoT PR 17h-employee — DS-canvas 6-tab Employee Detail surface.
 *
 * Verifies the DS/page-profile.jsx grammar:
 *   - Six tabs (Overview / Positions / Skills / Cost rates / Time & leave / Activity)
 *   - 320px right rail with three SectionCards (Quick actions, Linked entities,
 *     Recent activity)
 *   - Switching tabs swaps body content (data-testid="employee-details-body")
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPersonDirectory, fetchPersonDirectoryById } from '@/lib/api/person-directory';
import { fetchBusinessAudit } from '@/lib/api/business-audit';
import { fetchEmployeeActivity } from '@/lib/api/employee-activity';
import { fetchPerson360 } from '@/lib/api/pulse';
import { fetchPersonSkills, fetchSkills } from '@/lib/api/skills';
import { EmployeeDetailsPage } from './EmployeeDetailsPage';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'hr-1', roles: ['hr_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/person-directory', () => ({
  deactivateEmployee: vi.fn(),
  fetchPersonDirectory: vi.fn(),
  fetchPersonDirectoryById: vi.fn(),
}));

vi.mock('@/lib/api/reporting-lines', () => ({
  createReportingLine: vi.fn(),
  terminateReportingLine: vi.fn(),
}));

vi.mock('@/lib/api/pulse', () => ({
  fetchPerson360: vi.fn(),
  fetchPulseHistory: vi.fn(),
  submitPulse: vi.fn(),
  fetchMoodHeatmap: vi.fn(),
}));

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn(),
}));

vi.mock('@/lib/api/employee-activity', () => ({
  fetchEmployeeActivity: vi.fn(),
}));

vi.mock('@/lib/api/skills', () => ({
  fetchPersonSkills: vi.fn(),
  fetchSkills: vi.fn(),
  upsertPersonSkills: vi.fn(),
}));

const PERSON = {
  currentAssignmentCount: 3,
  currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
  currentOrgUnit: { code: 'DEP-APP', id: 'o1', name: 'Application Engineering' },
  displayName: 'Ethan Brooks',
  dottedLineManagers: [],
  grade: null,
  id: 'p1',
  primaryEmail: 'ethan.brooks@example.com',
  lifecycleStatus: 'ACTIVE',
  resourcePoolIds: ['pool-1'],
  resourcePools: [{ id: 'pool-1', name: 'Engineering Pool' }],
  role: null,
  hiredAt: null,
  terminatedAt: null,
};

describe('EmployeeDetailsPage — DS canvas 6-tab grammar', () => {
  beforeEach(() => {
    vi.mocked(fetchPersonDirectoryById).mockResolvedValue(PERSON);
    vi.mocked(fetchPersonDirectory).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 500,
      total: 0,
    });
    vi.mocked(fetchPerson360).mockResolvedValue({
      personId: 'p1',
      displayName: 'Ethan Brooks',
      moodTrend: [],
      workloadTrend: [],
      hoursTrend: [],
      currentMood: 3,
      currentAllocation: 50,
      alertActive: false,
    });
    vi.mocked(fetchBusinessAudit).mockResolvedValue({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 100,
    });
    vi.mocked(fetchEmployeeActivity).mockResolvedValue([]);
    vi.mocked(fetchPersonSkills).mockResolvedValue([]);
    vi.mocked(fetchSkills).mockResolvedValue([]);
  });

  it('renders all six canvas tabs', async () => {
    renderWithRouter('/people/p1');

    expect(await screen.findByTestId('person-detail-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
    expect(screen.getByTestId('tab-positions')).toBeInTheDocument();
    expect(screen.getByTestId('tab-skills')).toBeInTheDocument();
    expect(screen.getByTestId('tab-cost')).toBeInTheDocument();
    expect(screen.getByTestId('tab-time')).toBeInTheDocument();
    expect(screen.getByTestId('tab-activity')).toBeInTheDocument();
    // History/360 tabs from the legacy grammar must be gone.
    expect(screen.queryByTestId('tab-history')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-360')).not.toBeInTheDocument();
  });

  it('switches tabs to swap body content', async () => {
    const user = userEvent.setup();
    renderWithRouter('/people/p1');

    // Overview is the default and shows the Employee Summary card.
    expect(await screen.findByText('Employee Summary')).toBeInTheDocument();

    // Positions tab shows the staffing-desk EmptyState forward action.
    await user.click(screen.getByTestId('tab-positions'));
    expect(await screen.findByText('3 active positions')).toBeInTheDocument();
    expect(screen.queryByText('Employee Summary')).not.toBeInTheDocument();

    // Cost rates tab swaps to the finance admin forward action.
    await user.click(screen.getByTestId('tab-cost'));
    expect(await screen.findByText('Cost rate history not available here')).toBeInTheDocument();

    // Time & leave tab swaps to the workspace forward action.
    await user.click(screen.getByTestId('tab-time'));
    expect(await screen.findByText('Time & leave lives on the workspace')).toBeInTheDocument();

    // Activity tab triggers the audit-feed fetch.
    await user.click(screen.getByTestId('tab-activity'));
    expect(await screen.findByText('Change History')).toBeInTheDocument();
  });

  it('renders the 320px right rail with three SectionCards', async () => {
    renderWithRouter('/people/p1');

    const rail = await screen.findByTestId('employee-details-right-rail');
    expect(rail).toBeInTheDocument();
    // Three canvas SectionCards live in the right rail.
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.getByText('Linked entities')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
  });
});

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<EmployeeDetailsPage />} path="/people/:id" />
      </Routes>
    </MemoryRouter>,
  );
}
