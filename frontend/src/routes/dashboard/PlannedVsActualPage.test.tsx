import { screen, within } from '@testing-library/react';
import { vi } from 'vitest';

import { fetchPlannedVsActual, type PlannedVsActualResponse } from '@/lib/api/planned-vs-actual';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { PlannedVsActualPage } from './PlannedVsActualPage';
import { renderRoute } from '@test/render-route';

vi.mock('@/lib/api/planned-vs-actual', () => ({
  fetchPlannedVsActual: vi.fn(),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/platform-settings', () => ({
  fetchPlatformSettings: vi.fn(() =>
    Promise.resolve({ timesheets: { standardHoursPerWeek: 40 } }),
  ),
}));

const mockedFetchPlannedVsActual = vi.mocked(fetchPlannedVsActual);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);

const EMPTY_TIMESHEET_SUMMARY = {
  totalHours: 0,
  approvedHours: 0,
  submittedHours: 0,
  draftHours: 0,
  rejectedHours: 0,
  personCount: 0,
  missingPersonCount: 0,
  missingPersonIds: [],
};

const EMPTY_STAFFING_COVERAGE = {
  projectsFullyStaffed: 0,
  projectsPartiallyStaffed: 0,
  projectsWithOpenRequests: 0,
  totalOpenRequests: 0,
  totalUnfilledHeadcount: 0,
  unstaffedProjects: [],
};

const FULL_RESPONSE: PlannedVsActualResponse = {
  anomalies: [
    {
      message: 'Observed work exists after the assignment end date.',
      person: { displayName: 'Ethan Brooks', id: 'person-1' },
      project: { id: 'project-1', name: 'Atlas ERP Rollout', projectCode: 'PRJ-102' },
      type: 'EVIDENCE_AFTER_ASSIGNMENT_END',
    },
  ],
  asOf: '2025-03-15T00:00:00.000Z',
  weekStart: '2025-03-10T00:00:00.000Z',
  weekEnd: '2025-03-16T23:59:59.999Z',
  weeksIncluded: 4,
  assignedButNoEvidence: [
    {
      allocationPercent: 100,
      assignmentId: 'asn-1',
      person: { displayName: 'Mia Lopez', id: 'person-2' },
      project: { id: 'project-2', name: 'Beacon Mobile Revamp', projectCode: 'PRJ-103' },
      staffingRole: 'Mobile Engineer',
    },
  ],
  evidenceButNoApprovedAssignment: [
    {
      activityDate: '2025-03-05T00:00:00.000Z',
      effortHours: 2,
      person: { displayName: 'Harper Ali', id: 'person-3' },
      project: { id: 'project-3', name: 'Nova Analytics Migration', projectCode: 'PRJ-104' },
      sourceType: 'JIRA_WORKLOG',
      workEvidenceId: 'we-1',
    },
  ],
  matchedRecords: [
    {
      allocationPercent: 50,
      assignmentId: 'asn-2',
      effortHours: 4,
      person: { displayName: 'Ethan Brooks', id: 'person-1' },
      project: { id: 'project-1', name: 'Atlas ERP Rollout', projectCode: 'PRJ-102' },
      staffingRole: 'Lead Engineer',
      workEvidenceId: 'we-2',
    },
  ],
  timesheetStatusSummary: {
    totalHours: 6,
    approvedHours: 4,
    submittedHours: 2,
    draftHours: 0,
    rejectedHours: 0,
    personCount: 2,
    missingPersonCount: 1,
    missingPersonIds: ['person-2'],
  },
  projectSummaries: [
    {
      projectId: 'project-1', projectCode: 'PRJ-102', projectName: 'Atlas ERP Rollout',
      plannedHours: 20, approvedHours: 4, submittedHours: 0, draftHours: 0,
      totalActualHours: 4, assignmentCount: 1, openStaffingRequests: 0,
      unfilledHeadcount: 0, variance: -16, variancePercent: -80, overSubmitted: false,
    },
    {
      projectId: 'project-2', projectCode: 'PRJ-103', projectName: 'Beacon Mobile Revamp',
      plannedHours: 40, approvedHours: 0, submittedHours: 0, draftHours: 0,
      totalActualHours: 0, assignmentCount: 1, openStaffingRequests: 1,
      unfilledHeadcount: 2, variance: -40, variancePercent: -100, overSubmitted: false,
    },
    {
      projectId: 'project-3', projectCode: 'PRJ-104', projectName: 'Nova Analytics Migration',
      plannedHours: 0, approvedHours: 0, submittedHours: 2, draftHours: 0,
      totalActualHours: 2, assignmentCount: 0, openStaffingRequests: 0,
      unfilledHeadcount: 0, variance: 2, variancePercent: 0, overSubmitted: false,
    },
  ],
  orgUnitSummaries: [
    { orgUnitId: 'org-1', orgUnitName: 'Engineering', personCount: 3, plannedHours: 60, submittedHours: 2, approvedHours: 4, draftHours: 0, submissionRate: 10, variance: -54 },
  ],
  resourcePoolSummaries: [
    { poolId: 'pool-1', poolName: 'Full Stack', personCount: 2, plannedHours: 40, submittedHours: 2, approvedHours: 4, draftHours: 0, submissionRate: 15, variance: -34 },
  ],
  staffingCoverage: {
    projectsFullyStaffed: 1,
    projectsPartiallyStaffed: 1,
    projectsWithOpenRequests: 1,
    totalOpenRequests: 1,
    totalUnfilledHeadcount: 2,
    unstaffedProjects: [
      { projectId: 'project-2', projectCode: 'PRJ-103', projectName: 'Beacon Mobile Revamp', openRequests: 1, unfilledHeadcount: 2, roles: ['Mobile Engineer'] },
    ],
  },
};

describe('PlannedVsActualPage', () => {
  beforeEach(() => {
    mockedFetchPlannedVsActual.mockReset();
    mockedFetchProjectDirectory.mockResolvedValue({ items: [] });
    mockedFetchPersonDirectory.mockResolvedValue({ items: [], page: 1, pageSize: 200, total: 0 });
  });

  it('renders KPI strip with expected summary values', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue(FULL_RESPONSE);

    renderRoute(<PlannedVsActualPage />);

    const strip = within(await screen.findByTestId('kpi-strip'));

    // Alignment Rate: 1 matched / 3 total = 33%
    expect(strip.getByText('33%')).toBeInTheDocument();
    expect(strip.getByText('Alignment Rate')).toBeInTheDocument();

    // Total Submitted
    expect(strip.getByText('Total Submitted')).toBeInTheDocument();

    // Pending Pipeline
    expect(strip.getByText('Pending Pipeline')).toBeInTheDocument();

    // Staffing Gaps
    expect(strip.getByText('Staffing Gaps')).toBeInTheDocument();

    // Risk Projects
    expect(strip.getByText('Risk Projects')).toBeInTheDocument();
  });

  it('renders hero chart', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue(FULL_RESPONSE);

    renderRoute(<PlannedVsActualPage />);

    expect(await screen.findByTestId('hero-chart')).toBeInTheDocument();
    expect(screen.getByText('Project Planned vs Actual')).toBeInTheDocument();
  });

  it('renders action table with severity-ranked items', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue(FULL_RESPONSE);

    renderRoute(<PlannedVsActualPage />);

    const tables = await screen.findAllByTestId('action-data-table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/What Needs Attention/)).toBeInTheDocument();

    // Action table should show people from the response
    expect(screen.getAllByText('Harper Ali').length).toBeGreaterThan(0);
  });

  it('renders top mismatched projects and people sections', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue(FULL_RESPONSE);

    renderRoute(<PlannedVsActualPage />);

    await screen.findByTestId('kpi-strip');

    expect(screen.getByText('Top Mismatched Projects')).toBeInTheDocument();
    expect(screen.getByText('Top Mismatched People')).toBeInTheDocument();
  });

  it('renders new secondary sections', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue(FULL_RESPONSE);

    renderRoute(<PlannedVsActualPage />);

    await screen.findByTestId('kpi-strip');

    expect(screen.getByText('Timesheet Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Staffing Coverage')).toBeInTheDocument();
    expect(screen.getByText('Submission Rate by Org')).toBeInTheDocument();
    expect(screen.getByText('Over-Submitted Projects')).toBeInTheDocument();
  });

  it('renders data freshness bar', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue(FULL_RESPONSE);

    renderRoute(<PlannedVsActualPage />);

    await screen.findByTestId('kpi-strip');

    expect(screen.getByText(/Showing 4 weeks/)).toBeInTheDocument();
  });

  it('handles empty data gracefully', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue({
      anomalies: [],
      asOf: '2025-03-15T00:00:00.000Z',
      weekStart: '2025-02-17T00:00:00.000Z',
      weekEnd: '2025-03-16T23:59:59.999Z',
      weeksIncluded: 4,
      assignedButNoEvidence: [],
      evidenceButNoApprovedAssignment: [],
      matchedRecords: [],
      timesheetStatusSummary: EMPTY_TIMESHEET_SUMMARY,
      projectSummaries: [],
      orgUnitSummaries: [],
      resourcePoolSummaries: [],
      staffingCoverage: EMPTY_STAFFING_COVERAGE,
    });

    renderRoute(<PlannedVsActualPage />);

    expect(await screen.findByText('No planned vs actual data')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchPlannedVsActual.mockRejectedValue(new Error('Comparison unavailable'));

    renderRoute(<PlannedVsActualPage />);

    expect(await screen.findByText('Comparison unavailable')).toBeInTheDocument();
  });

  it('renders detail explorer with category tabs', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue(FULL_RESPONSE);

    renderRoute(<PlannedVsActualPage />);

    await screen.findByTestId('kpi-strip');

    // Detail explorer category tabs
    expect(screen.getByText(/Unplanned Work \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Staffed, No Actual Time \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Matched \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Anomalies \(1\)/)).toBeInTheDocument();
  });
});
