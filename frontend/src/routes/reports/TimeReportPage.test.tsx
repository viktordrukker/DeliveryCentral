import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { TipsProvider } from '@/components/common/TipBalloon';
import { TitleBarProvider } from '@/app/title-bar-context';
import { TimeReportData, fetchTimeReport } from '@/lib/api/timesheets';
import { TimeReportPage } from './TimeReportPage';

vi.mock('@/lib/api/timesheets', () => ({
  fetchTimeReport: vi.fn(),
}));

vi.mock('@/lib/export', () => ({
  exportToXlsx: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchTimeReport);

const mockData: TimeReportData = {
  byProject: [],
  byPerson: [],
  byDay: [],
  weeklyTrend: [],
  capexHours: 0,
  opexHours: 0,
  standardHours: 0,
  overtimeHours: 0,
  benchHours: 0,
  leaveHours: 0,
  totalHours: 0,
};

function renderPage(initialEntries: string[] = ['/reports/time']): void {
  render(
    <TipsProvider>
      <TitleBarProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <TimeReportPage />
        </MemoryRouter>
      </TitleBarProvider>
    </TipsProvider>,
  );
}

describe('TimeReportPage — Analysis Surface grammar (SCOPED-MIN-5)', () => {
  beforeEach(() => {
    mockedFetch.mockResolvedValue(mockData);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reads custom period + from/to from URL search params (Law 5)', async () => {
    renderPage(['/reports/time?period=custom&from=2026-03-01&to=2026-03-31']);

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith({ from: '2026-03-01', to: '2026-03-31' });
    });
  });
});
