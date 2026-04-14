import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchOrgChart } from '@/lib/api/org-chart';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { OrgPage } from './OrgPage';

vi.mock('@/lib/api/org-chart', () => ({
  fetchOrgChart: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/workload', () => ({
  fetchWorkloadMatrix: vi.fn(),
}));

vi.mock('@/components/org/InteractiveOrgChart', () => ({
  InteractiveOrgChart: ({ roots, people }: { roots: unknown[]; people: unknown[] }) => (
    <div data-testid="interactive-org-chart">Org chart with {roots.length} roots and {people.length} people</div>
  ),
}));

const mockedFetchOrgChart = vi.mocked(fetchOrgChart);
const mockedFetchDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchMatrix = vi.mocked(fetchWorkloadMatrix);

const SAMPLE_ORG = {
  dottedLineRelationships: [
    {
      managers: [{ displayName: 'Lucas Reed', id: 'mgr-2', lineManagerId: null, lineManagerName: null }],
      person: { displayName: 'Ethan Brooks', id: 'person-1', lineManagerId: 'mgr-1', lineManagerName: 'Sophia Kim' },
    },
  ],
  roots: [
    {
      children: [
        {
          children: [],
          code: 'DEP-APP',
          id: 'org-2',
          kind: 'DEPARTMENT',
          manager: { displayName: 'Sophia Kim', id: 'mgr-1', lineManagerId: null, lineManagerName: null },
          members: [
            { displayName: 'Ethan Brooks', id: 'person-1', lineManagerId: 'mgr-1', lineManagerName: 'Sophia Kim' },
          ],
          name: 'Application Engineering',
        },
      ],
      code: 'DIR-PLT',
      id: 'org-1',
      kind: 'DIRECTORATE',
      manager: { displayName: 'Olivia Chen', id: 'mgr-top', lineManagerId: null, lineManagerName: null },
      members: [],
      name: 'Platform Directorate',
    },
  ],
};

const SAMPLE_PEOPLE = {
  items: [
    {
      id: 'person-1',
      displayName: 'Ethan Brooks',
      primaryEmail: 'ethan@example.com',
      currentLineManager: { id: 'mgr-1', displayName: 'Sophia Kim' },
      currentOrgUnit: { id: 'org-2', code: 'DEP-APP', name: 'Application Engineering' },
      currentAssignmentCount: 1,
      dottedLineManagers: [],
      grade: null,
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: [],
      resourcePools: [],
      role: null,
    },
  ],
  page: 1,
  pageSize: 500,
  total: 1,
};

function setupMocks(): void {
  mockedFetchOrgChart.mockResolvedValue(SAMPLE_ORG);
  mockedFetchDirectory.mockResolvedValue(SAMPLE_PEOPLE);
  mockedFetchMatrix.mockResolvedValue({ people: [], projects: [] });
}

describe('OrgPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders org chart page with title', async () => {
    renderWithRouter();

    expect(await screen.findByText('Org Chart')).toBeInTheDocument();
  });

  it('renders the interactive chart container', async () => {
    renderWithRouter();

    // The chart viewport should be present (people view is default, needs people data)
    await screen.findByText('Org Chart');
    expect(document.querySelector('.org-chart-viewport')).toBeInTheDocument();
  });

  it('supports search filtering', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Org Chart');
    const searchInput = screen.getByPlaceholderText('Search org units, people...');
    await user.type(searchInput, 'Platform');

    expect(searchInput).toHaveValue('Platform');
  });

  it('shows error state when all data sources fail', async () => {
    mockedFetchOrgChart.mockRejectedValue(new Error('Org chart unavailable'));
    mockedFetchDirectory.mockRejectedValue(new Error('Directory unavailable'));
    mockedFetchMatrix.mockRejectedValue(new Error('Matrix unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Failed to load org chart data.')).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/org']}>
      <Routes>
        <Route element={<OrgPage />} path="/org" />
      </Routes>
    </MemoryRouter>,
  );
}
