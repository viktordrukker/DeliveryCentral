import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchOrgChart } from '@/lib/api/org-chart';
import { OrgPage } from './OrgPage';

vi.mock('@/lib/api/org-chart', () => ({
  fetchOrgChart: vi.fn(),
}));

vi.mock('@/components/org/InteractiveOrgChart', () => ({
  InteractiveOrgChart: ({ roots }: { roots: unknown[] }) => (
    <div data-testid="interactive-org-chart">Org chart with {roots.length} roots</div>
  ),
}));

const mockedFetchOrgChart = vi.mocked(fetchOrgChart);

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

describe('OrgPage', () => {
  beforeEach(() => {
    mockedFetchOrgChart.mockReset();
  });

  it('renders org chart page with title', async () => {
    mockedFetchOrgChart.mockResolvedValue(SAMPLE_ORG);

    renderWithRouter();

    expect(await screen.findByText('Org Chart')).toBeInTheDocument();
  });

  it('renders the interactive chart container', async () => {
    mockedFetchOrgChart.mockResolvedValue(SAMPLE_ORG);

    renderWithRouter();

    // The chart viewport should be present
    await screen.findByText('Org Chart');
    expect(document.querySelector('.org-chart-viewport')).toBeInTheDocument();
  });

  it('supports search filtering', async () => {
    mockedFetchOrgChart.mockResolvedValue({
      dottedLineRelationships: [],
      roots: [
        {
          children: [],
          code: 'DIR-DEL',
          id: 'org-1',
          kind: 'DIRECTORATE',
          manager: null,
          members: [],
          name: 'Delivery Directorate',
        },
        {
          children: [],
          code: 'DIR-PLT',
          id: 'org-2',
          kind: 'DIRECTORATE',
          manager: null,
          members: [],
          name: 'Platform Directorate',
        },
      ],
    });

    const user = userEvent.setup();
    renderWithRouter();

    await screen.findByText('Org Chart');
    const searchInput = screen.getByPlaceholderText('Search org units, people...');
    await user.type(searchInput, 'Platform');

    expect(searchInput).toHaveValue('Platform');
  });

  it('shows error state', async () => {
    mockedFetchOrgChart.mockRejectedValue(new Error('Org chart unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Org chart unavailable')).toBeInTheDocument();
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
