import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { UtilizationReport, fetchUtilizationReport } from '@/lib/api/utilization';
import { UtilizationPage } from './UtilizationPage';

vi.mock('@/lib/api/utilization', () => ({
  fetchUtilizationReport: vi.fn(),
}));

vi.mock('@/lib/export', () => ({
  exportToXlsx: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchUtilizationReport);

const mockReport: UtilizationReport = {
  fromDate: '2026-05-01',
  toDate: '2026-05-31',
  stdHoursPerDay: 8,
  byPerson: [
    {
      personId: 'p1',
      personName: 'Alice Anderson',
      availableHours: 160,
      assignedHours: 120,
      actualHours: 110,
      utilizationPercent: 75,
    },
    {
      personId: 'p2',
      personName: 'Bob Brown',
      availableHours: 160,
      assignedHours: 200,
      actualHours: 190,
      utilizationPercent: 125,
    },
    {
      personId: 'p3',
      personName: 'Charlie Chen',
      availableHours: 160,
      assignedHours: 60,
      actualHours: 50,
      utilizationPercent: 35,
    },
  ],
};

function renderPage(initialEntries: string[] = ['/reports/utilization']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <UtilizationPage />
    </MemoryRouter>,
  );
}

describe('UtilizationPage — Analysis Surface grammar (SCOPED-MIN-5)', () => {
  beforeEach(() => {
    mockedFetch.mockResolvedValue(mockReport);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders KPI strip with people / avg utilization / over-allocated / under-utilized', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('kpi-people')).toBeInTheDocument();
    });

    expect(screen.getByTestId('kpi-people')).toHaveTextContent('3');
    // Average of 75 / 125 / 35 = 78.
    expect(screen.getByTestId('kpi-avg-utilization')).toHaveTextContent('78');
    // 1 over-allocated (Bob @ 125%).
    expect(screen.getByTestId('kpi-over-allocated')).toHaveTextContent('1');
    // 1 under-utilized (Charlie @ 35%).
    expect(screen.getByTestId('kpi-under-utilized')).toHaveTextContent('1');
  });

  it('reads filter state from URL search params (Law 5 — filter persistence)', async () => {
    renderPage(['/reports/utilization?from=2026-01-01&to=2026-01-31']);

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-01-31' });
    });
  });
});
