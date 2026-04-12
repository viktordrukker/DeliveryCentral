import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPlannedVsActual } from '@/lib/api/planned-vs-actual';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { PlannedVsActualPage } from './PlannedVsActualPage';

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

describe('PlannedVsActualPage', () => {
  beforeEach(() => {
    mockedFetchPlannedVsActual.mockReset();
    mockedFetchProjectDirectory.mockResolvedValue({ items: [] });
    mockedFetchPersonDirectory.mockResolvedValue({ items: [], page: 1, pageSize: 200, total: 0 });
  });

  it('renders all major categories', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue({
      anomalies: [
        {
          message: 'Observed work exists after the assignment end date.',
          person: { displayName: 'Ethan Brooks', id: 'person-1' },
          project: { id: 'project-1', name: 'Atlas ERP Rollout', projectCode: 'PRJ-102' },
          type: 'EVIDENCE_AFTER_ASSIGNMENT_END',
        },
      ],
      asOf: '2025-03-15T00:00:00.000Z',
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
    });

    renderWithRouter();

    // Tab buttons are present with counts
    expect((await screen.findAllByText(/Matched Records/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Assigned, No Evidence/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Evidence, No Assignment/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Anomalies/).length).toBeGreaterThan(0);

    // Default tab (matched) shows Ethan Brooks in the table
    expect(screen.getByText('Ethan Brooks')).toBeInTheDocument();
  });

  it('shows empty result handling', async () => {
    mockedFetchPlannedVsActual.mockResolvedValue({
      anomalies: [],
      asOf: '2025-03-15T00:00:00.000Z',
      assignedButNoEvidence: [],
      evidenceButNoApprovedAssignment: [],
      matchedRecords: [],
    });

    renderWithRouter();

    expect(await screen.findByText('No planned vs actual results')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockedFetchPlannedVsActual.mockRejectedValue(new Error('Comparison unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Comparison unavailable')).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/dashboard/planned-vs-actual']}>
      <Routes>
        <Route element={<PlannedVsActualPage />} path="/dashboard/planned-vs-actual" />
      </Routes>
    </MemoryRouter>,
  );
}
