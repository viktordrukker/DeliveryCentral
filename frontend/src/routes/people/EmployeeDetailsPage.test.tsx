import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { ApiError } from '@/lib/api/http-client';
import {
  deactivateEmployee,
  fetchPersonDirectory,
  fetchPersonDirectoryById,
} from '@/lib/api/person-directory';
import { createReportingLine } from '@/lib/api/reporting-lines';
import { fetchPerson360 } from '@/lib/api/pulse';
import { fetchBusinessAudit } from '@/lib/api/business-audit';
import { fetchPersonSkills, fetchSkills } from '@/lib/api/skills';
import { EmployeeDetailsPlaceholderPage } from './EmployeeDetailsPlaceholderPage';

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
}));

vi.mock('@/lib/api/pulse', () => ({
  fetchPerson360: vi.fn(),
  fetchPulseHistory: vi.fn(),
  submitPulse: vi.fn(),
  fetchMoodHeatmap: vi.fn(),
}));

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 }),
}));

vi.mock('@/lib/api/skills', () => ({
  fetchPersonSkills: vi.fn().mockResolvedValue([]),
  fetchSkills: vi.fn().mockResolvedValue([]),
  upsertPersonSkills: vi.fn().mockResolvedValue([]),
}));

const mockedFetchPersonDirectoryById = vi.mocked(fetchPersonDirectoryById);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedDeactivateEmployee = vi.mocked(deactivateEmployee);
const mockedCreateReportingLine = vi.mocked(createReportingLine);
const mockedFetchPerson360 = vi.mocked(fetchPerson360);
const mockedFetchBusinessAudit = vi.mocked(fetchBusinessAudit);
const mockedFetchPersonSkills = vi.mocked(fetchPersonSkills);
const mockedFetchSkills = vi.mocked(fetchSkills);

describe('EmployeeDetailsPage', () => {
  beforeEach(() => {
    mockedFetchPersonDirectoryById.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedDeactivateEmployee.mockReset();
    mockedCreateReportingLine.mockReset();
    mockedFetchPerson360.mockReset();
    mockedFetchBusinessAudit.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 });
    mockedFetchPersonSkills.mockResolvedValue([]);
    mockedFetchSkills.mockResolvedValue([]);

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 1,
          currentLineManager: null,
          currentOrgUnit: { code: 'DEP-APP', id: 'o1', name: 'Application Engineering' },
          displayName: 'Ethan Brooks',
          dottedLineManagers: [],
          grade: null,
          id: 'p1',
          primaryEmail: 'ethan.brooks@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: ['pool-1'],
          resourcePools: [{ id: 'pool-1', name: 'Engineering Pool' }],
          role: null, hiredAt: null, terminatedAt: null,
        },
        {
          currentAssignmentCount: 0,
          currentLineManager: null,
          currentOrgUnit: { code: 'DEP-PLAT', id: 'o2', name: 'Platform Engineering' },
          displayName: 'Sophia Kim',
          dottedLineManagers: [],
          grade: null,
          id: 'm1',
          primaryEmail: 'sophia.kim@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: [],
          resourcePools: [],
          role: null, hiredAt: null, terminatedAt: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 2,
    });
  });

  it('renders person data', async () => {
    mockedFetchPersonDirectoryById.mockResolvedValue({
      currentAssignmentCount: 2,
      currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
      currentOrgUnit: {
        code: 'DEP-APP',
        id: 'o1',
        name: 'Application Engineering',
      },
      displayName: 'Ethan Brooks',
      dottedLineManagers: [{ displayName: 'Lucas Reed', id: 'm2' }],
      grade: null,
      id: 'p1',
      primaryEmail: 'ethan.brooks@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['pool-1'],
      resourcePools: [{ id: 'pool-1', name: 'Engineering Pool' }],
      role: null, hiredAt: null, terminatedAt: null,
    });

    renderWithRouter('/people/p1');

    expect((await screen.findAllByText('Ethan Brooks')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Application Engineering').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sophia Kim').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lucas Reed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('Reporting Line Management')).toBeInTheDocument();
    expect(screen.getByLabelText('Manager')).toBeInTheDocument();
    expect(screen.getByLabelText('Reporting Type')).toHaveValue('SOLID');
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  it('shows missing person state', async () => {
    mockedFetchPersonDirectoryById.mockRejectedValue(
      new ApiError('Request failed for /org/people/missing', 404),
    );

    renderWithRouter('/people/missing');

    expect(await screen.findByText('Employee not found')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchPersonDirectoryById.mockRejectedValue(
      new Error('Employee details unavailable'),
    );

    renderWithRouter('/people/p1');

    expect(await screen.findByText('Employee details unavailable')).toBeInTheDocument();
  });

  it('deactivates an employee', async () => {
    mockedFetchPersonDirectoryById.mockResolvedValue({
      currentAssignmentCount: 2,
      currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
      currentOrgUnit: {
        code: 'DEP-APP',
        id: 'o1',
        name: 'Application Engineering',
      },
      displayName: 'Ethan Brooks',
      dottedLineManagers: [{ displayName: 'Lucas Reed', id: 'm2' }],
      grade: null,
      id: 'p1',
      primaryEmail: 'ethan.brooks@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['pool-1'],
      resourcePools: [{ id: 'pool-1', name: 'Engineering Pool' }],
      role: null, hiredAt: null, terminatedAt: null,
    });
    mockedDeactivateEmployee.mockResolvedValue({
      email: 'ethan.brooks@example.com',
      id: 'p1',
      name: 'Ethan Brooks',
      orgUnitId: 'o1',
      skillsets: [],
      status: 'INACTIVE',
    });

    const user = userEvent.setup();
    renderWithRouter('/people/p1');

    expect((await screen.findAllByText('Ethan Brooks')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Deactivate employee' }));

    // Confirm dialog now appears — click the confirm button
    expect(await screen.findByText('Deactivate Employee')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Employee Ethan Brooks deactivated.')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('submits a valid reporting line change', async () => {
    mockedFetchPersonDirectoryById.mockResolvedValue({
      currentAssignmentCount: 2,
      currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
      currentOrgUnit: {
        code: 'DEP-APP',
        id: 'o1',
        name: 'Application Engineering',
      },
      displayName: 'Ethan Brooks',
      dottedLineManagers: [{ displayName: 'Lucas Reed', id: 'm2' }],
      grade: null,
      id: 'p1',
      primaryEmail: 'ethan.brooks@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['pool-1'],
      resourcePools: [{ id: 'pool-1', name: 'Engineering Pool' }],
      role: null, hiredAt: null, terminatedAt: null,
    });
    mockedCreateReportingLine.mockResolvedValue({
      id: 'line-1',
      managerId: 'm1',
      personId: 'p1',
      startDate: '2026-07-01T00:00:00.000Z',
      type: 'SOLID',
    });

    const user = userEvent.setup();
    renderWithRouter('/people/p1');

    await screen.findByText('Reporting Line Management');
    await user.selectOptions(screen.getByLabelText('Manager'), 'm1');
    await user.type(screen.getByLabelText('Start Date'), '2026-07-01');
    await user.click(screen.getByRole('button', { name: 'Save reporting line' }));

    expect(mockedCreateReportingLine).toHaveBeenCalledWith({
      managerId: 'm1',
      personId: 'p1',
      startDate: '2026-07-01T00:00:00.000Z',
      type: 'SOLID',
    });
    expect(
      await screen.findByText('Scheduled Sophia Kim as line manager effective 2026-07-01.'),
    ).toBeInTheDocument();
  });

  it('shows reporting line validation errors', async () => {
    mockedFetchPersonDirectoryById.mockResolvedValue({
      currentAssignmentCount: 2,
      currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
      currentOrgUnit: {
        code: 'DEP-APP',
        id: 'o1',
        name: 'Application Engineering',
      },
      displayName: 'Ethan Brooks',
      dottedLineManagers: [{ displayName: 'Lucas Reed', id: 'm2' }],
      grade: null,
      id: 'p1',
      primaryEmail: 'ethan.brooks@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: ['pool-1'],
      resourcePools: [{ id: 'pool-1', name: 'Engineering Pool' }],
      role: null, hiredAt: null, terminatedAt: null,
    });

    const user = userEvent.setup();
    renderWithRouter('/people/p1');

    await screen.findByText('Reporting Line Management');
    await user.click(screen.getByRole('button', { name: 'Save reporting line' }));

    expect(screen.getByText('Manager is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
  });

  it('renders 360 View tab and loads 360 data when clicked', async () => {
    mockedFetchPersonDirectoryById.mockResolvedValue({
      currentAssignmentCount: 1,
      currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
      currentOrgUnit: { code: 'DEP-APP', id: 'o1', name: 'Application Engineering' },
      displayName: 'Ethan Brooks',
      dottedLineManagers: [],
      grade: null,
      id: 'p1',
      primaryEmail: 'ethan.brooks@example.com',
      lifecycleStatus: 'ACTIVE',
      resourcePoolIds: [],
      resourcePools: [],
      role: null, hiredAt: null, terminatedAt: null,
    });

    mockedFetchPerson360.mockResolvedValue({
      personId: 'p1',
      displayName: 'Ethan Brooks',
      moodTrend: [{ weekStart: '2026-01-06', mood: 4 }],
      workloadTrend: [{ weekStart: '2026-01-06', allocationPercent: 75 }],
      hoursTrend: [{ weekStart: '2026-01-06', hours: 35 }],
      currentMood: 4,
      currentAllocation: 75,
      alertActive: false,
    });

    const user = userEvent.setup();
    renderWithRouter('/people/p1');

    // Tab nav is visible to hr_manager
    expect(await screen.findByTestId('person-detail-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-360')).toBeInTheDocument();

    // Click 360 View tab
    await user.click(screen.getByTestId('tab-360'));

    // 360 content should load
    expect(await screen.findByTestId('person-360-tab')).toBeInTheDocument();
    expect(screen.getByText('Current Mood')).toBeInTheDocument();
  });
});

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<EmployeeDetailsPlaceholderPage />} path="/people/:id" />
      </Routes>
    </MemoryRouter>,
  );
}
