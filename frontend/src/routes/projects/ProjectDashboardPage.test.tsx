import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchProjectDashboard } from '@/lib/api/project-dashboard';
import { fetchPlannedVsActual } from '@/lib/api/planned-vs-actual';
import { fetchProjectById } from '@/lib/api/project-registry';
import { fetchWorkEvidence } from '@/lib/api/work-evidence';
import { ProjectDashboardPage } from './ProjectDashboardPage';

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectById: vi.fn(),
}));

vi.mock('@/lib/api/project-dashboard', () => ({
  fetchProjectDashboard: vi.fn(),
}));

vi.mock('@/lib/api/work-evidence', () => ({
  fetchWorkEvidence: vi.fn(),
}));

vi.mock('@/lib/api/planned-vs-actual', () => ({
  fetchPlannedVsActual: vi.fn(),
}));

const mockedFetchProjectById = vi.mocked(fetchProjectById);
const mockedFetchProjectDashboard = vi.mocked(fetchProjectDashboard);
const mockedFetchWorkEvidence = vi.mocked(fetchWorkEvidence);
const mockedFetchPlannedVsActual = vi.mocked(fetchPlannedVsActual);

describe('ProjectDashboardPage', () => {
  beforeEach(() => {
    mockedFetchProjectById.mockReset();
    mockedFetchProjectDashboard.mockReset();
    mockedFetchWorkEvidence.mockReset();
    mockedFetchPlannedVsActual.mockReset();
  });

  it('renders aggregated project dashboard data', async () => {
    mockResponses();

    renderWithRouter('/projects/prj-1/dashboard');

    expect((await screen.findAllByText('Atlas ERP Rollout')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Assigned People').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ethan Brooks').length).toBeGreaterThan(0);
    expect(screen.getByText('Recorded effort')).toBeInTheDocument();
    expect(screen.getByText('2.5 hours total')).toBeInTheDocument();
  });

  it('shows empty project sections clearly', async () => {
    mockResponses({
      dashboard: {
        allocationByPerson: [],
        asOf: '2026-03-30T00:00:00.000Z',
        assignments: [],
        evidenceByWeek: [],
        project: {
          description: null,
          endsOn: null,
          id: 'prj-1',
          name: 'Atlas ERP Rollout',
          projectCode: 'PRJ-102',
          projectManagerId: null,
          startsOn: null,
          status: 'ACTIVE',
        },
        staffingSummary: { activeAssignmentCount: 0, totalAssignments: 0, totalEvidenceHoursLast30d: 0 },
      },
      comparison: {
        anomalies: [],
        asOf: '2026-03-30T00:00:00.000Z',
        assignedButNoEvidence: [],
        evidenceButNoApprovedAssignment: [],
        matchedRecords: [],
      },
      workEvidence: { items: [] },
    });

    renderWithRouter('/projects/prj-1/dashboard');

    expect(await screen.findByText('No assignments')).toBeInTheDocument();
    expect(screen.getByText('No work evidence')).toBeInTheDocument();
    expect(screen.getByText('No comparison data')).toBeInTheDocument();
  });

  it('renders anomalies in a separate panel', async () => {
    mockResponses({
      comparison: {
        anomalies: [
          {
            message: 'Observed work exists after the planned staffing window.',
            person: { displayName: 'Ethan Brooks', id: 'person-1' },
            project: { id: 'prj-1', name: 'Atlas ERP Rollout', projectCode: 'PRJ-102' },
            type: 'EVIDENCE_AFTER_ASSIGNMENT_END',
          },
        ],
        asOf: '2026-03-30T00:00:00.000Z',
        assignedButNoEvidence: [],
        evidenceButNoApprovedAssignment: [],
        matchedRecords: [],
      },
    });

    renderWithRouter('/projects/prj-1/dashboard');

    expect(await screen.findByText('Planned vs Actual Anomalies')).toBeInTheDocument();
    expect(screen.getByText('Evidence After Assignment End')).toBeInTheDocument();
    expect(screen.getByText('Observed work exists after the planned staffing window.')).toBeInTheDocument();
  });
});

const defaultDashboard: Awaited<ReturnType<typeof fetchProjectDashboard>> = {
  allocationByPerson: [
    { allocationPercent: 100, displayName: 'Ethan Brooks', personId: 'person-1' },
  ],
  asOf: '2026-03-30T00:00:00.000Z',
  assignments: [
    {
      allocationPercent: 100,
      id: 'asn-1',
      personDisplayName: 'Ethan Brooks',
      personId: 'person-1',
      staffingRole: 'Lead Engineer',
      status: 'APPROVED',
      validFrom: '2026-03-01',
      validTo: null,
    },
  ],
  evidenceByWeek: [
    { totalHours: 8, weekStarting: '2026-03-16' },
  ],
  project: {
    description: 'Jira-linked ERP rollout program.',
    endsOn: null,
    id: 'prj-1',
    name: 'Atlas ERP Rollout',
    projectCode: 'PRJ-102',
    projectManagerId: null,
    startsOn: '2026-03-01',
    status: 'ACTIVE',
  },
  staffingSummary: { activeAssignmentCount: 1, totalAssignments: 1, totalEvidenceHoursLast30d: 24 },
};

function mockResponses(
  overrides: {
    dashboard?: Awaited<ReturnType<typeof fetchProjectDashboard>>;
    comparison?: Awaited<ReturnType<typeof fetchPlannedVsActual>>;
    project?: Awaited<ReturnType<typeof fetchProjectById>>;
    workEvidence?: Awaited<ReturnType<typeof fetchWorkEvidence>>;
  } = {},
): void {
  mockedFetchProjectById.mockResolvedValue(
    overrides.project ?? {
      assignmentCount: 1,
      description: 'Jira-linked ERP rollout program.',
      externalLinks: [],
      externalLinksCount: 0,
      externalLinksSummary: [],
      id: 'prj-1',
      name: 'Atlas ERP Rollout',
      plannedEndDate: null,
      projectCode: 'PRJ-102',
      projectManagerId: null,
      projectManagerDisplayName: null,
      startDate: null,
      status: 'ACTIVE',
    },
  );
  mockedFetchProjectDashboard.mockResolvedValue(overrides.dashboard ?? defaultDashboard);
  mockedFetchWorkEvidence.mockResolvedValue(
    overrides.workEvidence ?? {
      items: [
        {
          activityDate: '2026-03-20',
          effortHours: 2.5,
          id: 'we-1',
          personId: 'person-1',
          projectId: 'prj-1',
          recordedAt: '2026-03-20T10:00:00.000Z',
          sourceRecordKey: 'jira-1',
          sourceType: 'JIRA_WORKLOG',
          summary: 'Sprint delivery',
        },
      ],
    },
  );
  mockedFetchPlannedVsActual.mockResolvedValue(
    overrides.comparison ?? {
      anomalies: [],
      asOf: '2026-03-30T00:00:00.000Z',
      assignedButNoEvidence: [],
      evidenceButNoApprovedAssignment: [],
      matchedRecords: [
        {
          assignmentId: 'asn-1',
          effortHours: 2.5,
          person: { displayName: 'Ethan Brooks', id: 'person-1' },
          project: { id: 'prj-1', name: 'Atlas ERP Rollout', projectCode: 'PRJ-102' },
          staffingRole: 'Lead Engineer',
          workEvidenceId: 'we-1',
        },
      ],
    },
  );
}

function renderWithRouter(initialEntry: string): void {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ProjectDashboardPage />} path="/projects/:id/dashboard" />
      </Routes>
    </MemoryRouter>,
  );
}
