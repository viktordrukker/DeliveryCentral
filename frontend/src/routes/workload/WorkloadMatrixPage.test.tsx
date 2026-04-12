import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { fetchOrgChart } from '@/lib/api/org-chart';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { WorkloadMatrixPage } from './WorkloadMatrixPage';

vi.mock('@/lib/api/workload', () => ({
  fetchWorkloadMatrix: vi.fn(),
}));

vi.mock('@/lib/api/org-chart', () => ({
  fetchOrgChart: vi.fn(),
}));

vi.mock('@/lib/api/resource-pools', () => ({
  fetchResourcePools: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/export', () => ({
  exportToXlsx: vi.fn(),
}));

const mockedFetchMatrix = vi.mocked(fetchWorkloadMatrix);
const mockedFetchOrgChart = vi.mocked(fetchOrgChart);
const mockedFetchPools = vi.mocked(fetchResourcePools);
const mockedFetchDirectory = vi.mocked(fetchPersonDirectory);

const SAMPLE_MATRIX = {
  people: [
    {
      id: 'person-1',
      displayName: 'Alice Smith',
      allocations: [
        { projectId: 'project-1', projectName: 'Alpha Project', allocationPercent: 50 },
        { projectId: 'project-2', projectName: 'Beta Project', allocationPercent: 30 },
      ],
    },
    {
      id: 'person-2',
      displayName: 'Bob Jones',
      allocations: [
        { projectId: 'project-1', projectName: 'Alpha Project', allocationPercent: 100 },
      ],
    },
  ],
  projects: [
    { id: 'project-1', name: 'Alpha Project', projectCode: 'ALPHA' },
    { id: 'project-2', name: 'Beta Project', projectCode: 'BETA' },
  ],
};

function setupMocks(): void {
  mockedFetchMatrix.mockResolvedValue(SAMPLE_MATRIX);
  mockedFetchOrgChart.mockResolvedValue({ roots: [], dottedLineRelationships: [] });
  mockedFetchPools.mockResolvedValue({ items: [] });
  mockedFetchDirectory.mockResolvedValue({ items: [], page: 1, pageSize: 500, total: 0 });
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/workload']}>
      <Routes>
        <Route element={<WorkloadMatrixPage />} path="/workload" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkloadMatrixPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the page heading', async () => {
    renderPage();
    expect(await screen.findByText('Workload Matrix')).toBeInTheDocument();
  });

  it('renders person names in matrix rows', async () => {
    renderPage();
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('renders project codes as column headers', async () => {
    renderPage();
    expect(await screen.findByText('ALPHA')).toBeInTheDocument();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });

  it('renders allocation percentage cells', async () => {
    renderPage();
    // Alice has 50% on Alpha and 30% on Beta
    expect(await screen.findByText('50%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    // Bob has 100% on Alpha — multiple 100% values appear (cell + total)
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
  });

  it('renders row total for each person', async () => {
    renderPage();
    // Alice total = 50 + 30 = 80%
    expect(await screen.findByText('80%')).toBeInTheDocument();
  });

  it('renders column FTE totals row', async () => {
    renderPage();
    // Alpha project: (50 + 100) / 100 = 1.50 FTE
    expect(await screen.findByText('1.50')).toBeInTheDocument();
    // Beta project: 30 / 100 = 0.30 FTE
    expect(screen.getByText('0.30')).toBeInTheDocument();
  });

  it('shows empty state when no data', async () => {
    mockedFetchMatrix.mockResolvedValue({ people: [], projects: [] });
    renderPage();
    expect(await screen.findByText('No workload data')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockedFetchMatrix.mockRejectedValue(new Error('Failed to load'));
    renderPage();
    expect(await screen.findByText('Failed to load')).toBeInTheDocument();
  });
});
