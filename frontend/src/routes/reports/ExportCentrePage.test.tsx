import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchAssignments } from '@/lib/api/assignments';
import { fetchCapitalisationReport } from '@/lib/api/capitalisation';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchApprovalQueue } from '@/lib/api/timesheets';
import { fetchWorkloadMatrix } from '@/lib/api/workload';
import { exportToXlsx } from '@/lib/export';
import { renderRoute } from '@test/render-route';
import { ExportCentrePage } from './ExportCentrePage';

vi.mock('@/lib/api/assignments', () => ({ fetchAssignments: vi.fn() }));
vi.mock('@/lib/api/capitalisation', () => ({ fetchCapitalisationReport: vi.fn() }));
vi.mock('@/lib/api/person-directory', () => ({ fetchPersonDirectory: vi.fn() }));
vi.mock('@/lib/api/timesheets', () => ({ fetchApprovalQueue: vi.fn() }));
vi.mock('@/lib/api/workload', () => ({ fetchWorkloadMatrix: vi.fn() }));
vi.mock('@/lib/export', () => ({ exportToXlsx: vi.fn() }));

const mockedFetchAssignments = vi.mocked(fetchAssignments);
const mockedFetchCapitalisationReport = vi.mocked(fetchCapitalisationReport);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchApprovalQueue = vi.mocked(fetchApprovalQueue);
const mockedFetchWorkloadMatrix = vi.mocked(fetchWorkloadMatrix);
const mockedExportToXlsx = vi.mocked(exportToXlsx);

describe('ExportCentrePage', () => {
  beforeEach(() => {
    mockedFetchAssignments.mockReset();
    mockedFetchCapitalisationReport.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchApprovalQueue.mockReset();
    mockedFetchWorkloadMatrix.mockReset();
    mockedExportToXlsx.mockReset();
  });

  it('renders all report cards', () => {
    renderWithRouter();

    expect(screen.getByText('Export Centre')).toBeInTheDocument();
    expect(screen.getByText('Headcount Report')).toBeInTheDocument();
    expect(screen.getByText('Assignment Overview')).toBeInTheDocument();
    expect(screen.getByText('Timesheet Summary')).toBeInTheDocument();
    expect(screen.getByText('CAPEX/OPEX by Project')).toBeInTheDocument();
    expect(screen.getByText('Workload Matrix')).toBeInTheDocument();
  });

  it('renders "Generate & Download" buttons for each report', () => {
    renderWithRouter();

    const buttons = screen.getAllByRole('button', { name: 'Generate & Download' });
    expect(buttons).toHaveLength(5);
  });

  it('renders date range inputs for reports that need them', () => {
    renderWithRouter();

    // Timesheet Summary and CAPEX/OPEX by Project have date range inputs
    const fromInputs = screen.getAllByLabelText('From');
    const toInputs = screen.getAllByLabelText('To');
    expect(fromInputs.length).toBeGreaterThanOrEqual(2);
    expect(toInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('calls fetchPersonDirectory and exportToXlsx when Headcount Report generated', async () => {
    const user = userEvent.setup();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 2,
          currentLineManager: { displayName: 'Jane Smith', id: 'manager-1' },
          currentOrgUnit: { code: 'ENG', id: 'org-1', name: 'Engineering' },
          displayName: 'Alice Johnson',
          dottedLineManagers: [],
          id: 'person-1',
          lifecycleStatus: 'ACTIVE',
          primaryEmail: 'alice@example.com',
          resourcePoolIds: [],
          resourcePools: [],
        },
      ],
      page: 1,
      pageSize: 500,
      total: 1,
    });

    renderWithRouter();

    const buttons = screen.getAllByRole('button', { name: 'Generate & Download' });
    await user.click(buttons[0]); // Headcount Report is first

    expect(mockedFetchPersonDirectory).toHaveBeenCalledWith({ pageSize: 500 });
    expect(mockedExportToXlsx).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ Name: 'Alice Johnson', Email: 'alice@example.com' }),
      ]),
      expect.stringContaining('headcount_'),
    );
  });

  it('calls fetchAssignments and exportToXlsx when Assignment Overview generated', async () => {
    const user = userEvent.setup();

    mockedFetchAssignments.mockResolvedValue({
      items: [
        {
          allocationPercent: 100,
          approvalState: 'APPROVED',
          endDate: null,
          id: 'asn-1',
          person: { displayName: 'Bob Taylor', id: 'person-2' },
          project: { displayName: 'Atlas Project', id: 'project-1' },
          staffingRole: 'Developer',
          startDate: '2026-01-01',
        },
      ],
      totalCount: 1,
    });

    renderWithRouter();

    const buttons = screen.getAllByRole('button', { name: 'Generate & Download' });
    await user.click(buttons[1]); // Assignment Overview is second

    expect(mockedFetchAssignments).toHaveBeenCalledWith({ pageSize: 500 });
    expect(mockedExportToXlsx).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ Person: 'Bob Taylor', Project: 'Atlas Project' }),
      ]),
      expect.stringContaining('assignments_'),
    );
  });

  it('calls fetchApprovalQueue and exportToXlsx when Timesheet Summary generated', async () => {
    const user = userEvent.setup();

    mockedFetchApprovalQueue.mockResolvedValue([
      {
        approvedAt: '2026-04-05',
        approvedBy: 'manager-1',
        entries: [
          { capex: true, date: '2026-04-01', hours: 8, id: 'entry-1', projectId: 'project-1' },
          { capex: false, date: '2026-04-02', hours: 8, id: 'entry-2', projectId: 'project-1' },
        ],
        id: 'week-1',
        personId: 'person-1',
        status: 'APPROVED',
        weekStart: '2026-03-31',
      },
    ]);

    renderWithRouter();

    const buttons = screen.getAllByRole('button', { name: 'Generate & Download' });
    await user.click(buttons[2]); // Timesheet Summary is third

    expect(mockedFetchApprovalQueue).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED' }),
    );
    expect(mockedExportToXlsx).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ 'Total Hours': 16, 'CAPEX Hours': 8, 'OPEX Hours': 8 }),
      ]),
      expect.stringContaining('timesheets_'),
    );
  });

  it('calls fetchCapitalisationReport and exportToXlsx when CAPEX/OPEX report generated', async () => {
    const user = userEvent.setup();

    mockedFetchCapitalisationReport.mockResolvedValue({
      byProject: [
        {
          alert: false,
          capexHours: 60,
          capexPercent: 60,
          opexHours: 40,
          projectId: 'project-1',
          projectName: 'Atlas Project',
          totalHours: 100,
        },
      ],
      period: { from: '2026-01-01', to: '2026-04-05' },
      periodTrend: [],
      totals: { capexHours: 60, capexPercent: 60, opexHours: 40, totalHours: 100 },
    });

    renderWithRouter();

    const buttons = screen.getAllByRole('button', { name: 'Generate & Download' });
    await user.click(buttons[3]); // CAPEX/OPEX is fourth

    expect(mockedFetchCapitalisationReport).toHaveBeenCalled();
    expect(mockedExportToXlsx).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ Project: 'Atlas Project', 'CAPEX Hours': 60 }),
      ]),
      expect.stringContaining('capitalisation_'),
    );
  });

  it('calls fetchWorkloadMatrix and exportToXlsx when Workload Matrix generated', async () => {
    const user = userEvent.setup();

    mockedFetchWorkloadMatrix.mockResolvedValue({
      people: [
        {
          allocations: [{ allocationPercent: 80, projectId: 'p1', projectName: 'Atlas Project' }],
          displayName: 'Alice Johnson',
          id: 'person-1',
        },
      ],
      projects: [{ id: 'p1', name: 'Atlas Project', projectCode: 'PRJ-001' }],
    });

    renderWithRouter();

    const buttons = screen.getAllByRole('button', { name: 'Generate & Download' });
    await user.click(buttons[4]); // Workload Matrix is fifth

    expect(mockedFetchWorkloadMatrix).toHaveBeenCalled();
    expect(mockedExportToXlsx).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ Person: 'Alice Johnson', 'Atlas Project': 80 }),
      ]),
      expect.stringContaining('workload_matrix_'),
    );
  });

  it('shows loading state while generating', async () => {
    const user = userEvent.setup();

    let resolvePromise!: () => void;
    mockedFetchPersonDirectory.mockReturnValue(
      new Promise<never>((resolve) => {
        resolvePromise = () => resolve(undefined as never);
      }),
    );

    renderWithRouter();

    const buttons = screen.getAllByRole('button', { name: 'Generate & Download' });
    await user.click(buttons[0]);

    expect(screen.getByRole('button', { name: 'Generating…' })).toBeInTheDocument();

    // Cleanup
    resolvePromise();
  });
});

function renderWithRouter() {
  return renderRoute(
    <Routes>
      <Route element={<ExportCentrePage />} path="/reports/export" />
    </Routes>,
    { initialEntries: ['/reports/export'] },
  );
}
