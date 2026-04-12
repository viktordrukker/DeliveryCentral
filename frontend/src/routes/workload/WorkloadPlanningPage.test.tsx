import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchWorkloadPlanning, fetchCapacityForecast } from '@/lib/api/workload';
import { fetchResourcePools } from '@/lib/api/resource-pools';
import { fetchTeams } from '@/lib/api/teams';
import { WorkloadPlanningPage } from './WorkloadPlanningPage';

vi.mock('@/lib/api/workload', () => ({
  fetchWorkloadPlanning: vi.fn(),
  fetchCapacityForecast: vi.fn(),
}));

vi.mock('@/lib/api/resource-pools', () => ({
  fetchResourcePools: vi.fn(),
}));

vi.mock('@/lib/api/teams', () => ({
  fetchTeams: vi.fn(),
}));

vi.mock('@/lib/api/http-client', () => ({
  httpPatch: vi.fn().mockResolvedValue({}),
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
  }),
  useDroppable: () => ({ setNodeRef: () => undefined, isOver: false }),
}));

const mockedFetchPlanning = vi.mocked(fetchWorkloadPlanning);
const mockedFetchForecast = vi.mocked(fetchCapacityForecast);
const mockedFetchPools = vi.mocked(fetchResourcePools);
const mockedFetchTeams = vi.mocked(fetchTeams);

// Generate 12 weeks starting from today (Mon)
function generateWeeks(): string[] {
  const now = new Date('2026-04-07'); // use a fixed Monday for test stability
  const weeks: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() + i * 7);
    weeks.push(d.toISOString().slice(0, 10));
  }
  return weeks;
}

const SAMPLE_WEEKS = generateWeeks();

const SAMPLE_PLANNING = {
  people: [
    {
      id: 'person-1',
      displayName: 'Alice Smith',
      assignments: [
        {
          id: 'assign-1',
          projectId: 'project-1',
          projectName: 'Alpha Project',
          allocationPercent: 50,
          validFrom: '2026-04-01',
          validTo: '2026-06-30',
          status: 'APPROVED',
        },
        {
          id: 'assign-2',
          projectId: 'project-2',
          projectName: 'Beta Project',
          allocationPercent: 70,
          validFrom: '2026-04-01',
          validTo: '2026-06-30',
          status: 'APPROVED',
        },
      ],
    },
    {
      id: 'person-2',
      displayName: 'Bob Jones',
      assignments: [
        {
          id: 'assign-3',
          projectId: 'project-1',
          projectName: 'Alpha Project',
          allocationPercent: 100,
          validFrom: '2026-04-01',
          validTo: '2026-05-31',
          status: 'APPROVED',
        },
      ],
    },
  ],
  weeks: SAMPLE_WEEKS,
};

function setupMocks(): void {
  mockedFetchPlanning.mockResolvedValue(SAMPLE_PLANNING);
  mockedFetchForecast.mockResolvedValue([]);
  mockedFetchPools.mockResolvedValue({ items: [] });
  mockedFetchTeams.mockResolvedValue({ items: [] } as ReturnType<typeof fetchTeams> extends Promise<infer T> ? T : never);
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/workload/planning']}>
      <Routes>
        <Route element={<WorkloadPlanningPage />} path="/workload/planning" />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkloadPlanningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the page heading', async () => {
    renderPage();
    expect(await screen.findByText('Workload Planning Timeline')).toBeInTheDocument();
  });

  it('renders person names', async () => {
    renderPage();
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('renders 12 week headers', async () => {
    renderPage();
    // Week headers are in MM-DD format
    await screen.findByText('Alice Smith');
    const headers = screen.getAllByRole('columnheader');
    // First column is "Person", then 12 week columns
    expect(headers.length).toBe(13);
  });

  it('detects over-allocation conflict (Alice: 50% + 70% = 120%)', async () => {
    renderPage();
    await screen.findByText('Alice Smith');
    // Alice has 120% total allocation — should show conflict indicators
    const conflictCells = screen.getAllByText('120%');
    expect(conflictCells.length).toBeGreaterThan(0);
  });

  it('shows empty state when no people', async () => {
    mockedFetchPlanning.mockResolvedValue({ people: [], weeks: SAMPLE_WEEKS });
    renderPage();
    expect(await screen.findByText('No planning data')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    mockedFetchPlanning.mockRejectedValue(new Error('Planning API error'));
    renderPage();
    expect(await screen.findByText('Planning API error')).toBeInTheDocument();
  });

  it('shows what-if mode toggle', async () => {
    renderPage();
    await screen.findByText('Alice Smith');
    expect(screen.getByText('What-if mode')).toBeInTheDocument();
  });

  it('enables what-if mode form when toggled', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Alice Smith');
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(screen.getByText('What-If Mode — Add Hypothetical Assignment')).toBeInTheDocument();
  });
});
