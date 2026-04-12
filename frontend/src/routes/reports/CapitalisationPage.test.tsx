import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  CapitalisationReport,
  PeriodLock,
  createPeriodLock,
  deletePeriodLock,
  fetchCapitalisationReport,
  fetchPeriodLocks,
} from '@/lib/api/capitalisation';
import { exportToXlsx } from '@/lib/export';
import { CapitalisationPage } from './CapitalisationPage';

vi.mock('@/lib/api/capitalisation', () => ({
  fetchCapitalisationReport: vi.fn(),
  fetchPeriodLocks: vi.fn(),
  createPeriodLock: vi.fn(),
  deletePeriodLock: vi.fn(),
}));

vi.mock('@/lib/export', () => ({
  exportToXlsx: vi.fn(),
}));

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'admin-1', roles: ['admin'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockedFetch = vi.mocked(fetchCapitalisationReport);
const mockedFetchLocks = vi.mocked(fetchPeriodLocks);
const mockedCreateLock = vi.mocked(createPeriodLock);
const mockedDeleteLock = vi.mocked(deletePeriodLock);
const mockedExport = vi.mocked(exportToXlsx);

const mockReport: CapitalisationReport = {
  period: { from: '2026-04-01', to: '2026-04-30' },
  byProject: [
    {
      projectId: 'prj-1',
      projectName: 'Atlas ERP',
      capexHours: 80,
      opexHours: 20,
      totalHours: 100,
      capexPercent: 80,
    },
    {
      projectId: 'prj-2',
      projectName: 'Northstar',
      capexHours: 10,
      opexHours: 40,
      totalHours: 50,
      capexPercent: 20,
      alert: true,
      deviation: 0.25,
    },
  ],
  totals: {
    capexHours: 90,
    opexHours: 60,
    totalHours: 150,
    capexPercent: 60,
  },
  periodTrend: [
    { month: '2026-04', capexPercent: 60 },
  ],
};

const mockLocks: PeriodLock[] = [
  {
    id: 'lock-1',
    periodFrom: '2026-01-01',
    periodTo: '2026-01-31',
    lockedBy: 'admin-1',
    lockedAt: '2026-02-01T00:00:00.000Z',
  },
];

function renderPage(): void {
  render(
    <MemoryRouter>
      <CapitalisationPage />
    </MemoryRouter>,
  );
}

describe('CapitalisationPage', () => {
  beforeEach(() => {
    mockedFetch.mockResolvedValue(mockReport);
    mockedFetchLocks.mockResolvedValue(mockLocks);
    mockedCreateLock.mockResolvedValue({
      id: 'lock-2',
      periodFrom: '2026-02-01',
      periodTo: '2026-02-28',
      lockedBy: 'admin-1',
      lockedAt: '2026-03-01T00:00:00.000Z',
    });
    mockedDeleteLock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Capitalisation Report')).toBeInTheDocument();
  });

  it('renders the CAPEX/OPEX breakdown table', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Atlas ERP')).toBeInTheDocument();
    });

    expect(screen.getByText('Northstar')).toBeInTheDocument();
    expect(screen.getAllByText(/80\.0/).length).toBeGreaterThan(0);
    // Alert badge for Northstar
    expect(screen.getByText('⚠ Deviation')).toBeInTheDocument();
  });

  it('renders chart sections', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CAPEX vs OPEX Hours by Project')).toBeInTheDocument();
    });

    expect(screen.getByText('CAPEX % Trend by Month')).toBeInTheDocument();
  });

  it('fires XLSX export when button clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Atlas ERP')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Export XLSX' }));

    expect(mockedExport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ Project: 'Atlas ERP' }),
      ]),
      'capitalisation_report',
    );
  });

  it('shows period lock UI for admins', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Period Locks')).toBeInTheDocument();
    });

    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('can lock a new period', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Period Locks')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Lock From'), '2026-02-01');
    await user.type(screen.getByLabelText('Lock To'), '2026-02-28');
    await user.click(screen.getByRole('button', { name: 'Lock Period' }));

    await waitFor(() => {
      expect(mockedCreateLock).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
    });
  });

  it('can unlock a period', async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => {
      expect(mockedDeleteLock).toHaveBeenCalledWith('lock-1');
    });
  });

  it('shows error state when report fails', async () => {
    mockedFetch.mockRejectedValue(new Error('Report unavailable'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Report unavailable')).toBeInTheDocument();
    });
  });

  it('shows totals row in table', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Totals')).toBeInTheDocument();
    });

    expect(screen.getByText('150.0')).toBeInTheDocument();
  });
});
