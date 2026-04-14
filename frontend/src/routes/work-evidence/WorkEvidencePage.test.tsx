import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchWorkEvidence } from '@/lib/api/work-evidence';
import { WorkEvidencePage } from './WorkEvidencePage';

vi.mock('@/lib/api/work-evidence', () => ({
  fetchWorkEvidence: vi.fn(),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn(),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

const mockedFetchWorkEvidence = vi.mocked(fetchWorkEvidence);
const mockedFetchPersonDirectory = vi.mocked(fetchPersonDirectory);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);

describe('WorkEvidencePage', () => {
  beforeEach(() => {
    mockedFetchWorkEvidence.mockReset();
    mockedFetchPersonDirectory.mockReset();
    mockedFetchProjectDirectory.mockReset();

    mockedFetchPersonDirectory.mockResolvedValue({
      items: [
        {
          currentAssignmentCount: 2,
          currentLineManager: { displayName: 'Sophia Kim', id: 'mgr-1' },
          currentOrgUnit: { code: 'DEP-APP', id: 'org-1', name: 'Application Engineering' },
          displayName: 'Ethan Brooks',
          dottedLineManagers: [],
          grade: null,
          id: 'person-1',
          primaryEmail: 'ethan@example.com',
          lifecycleStatus: 'ACTIVE',
          resourcePoolIds: ['pool-1'],
          resourcePools: [],
          role: null,
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    });

    mockedFetchProjectDirectory.mockResolvedValue({
      items: [
        {
          assignmentCount: 3,
          externalLinksCount: 1,
          externalLinksSummary: [{ count: 1, provider: 'JIRA' }],
          id: 'project-1',
          name: 'Atlas ERP Rollout',
          projectCode: 'PRJ-102',
          status: 'ACTIVE',
        },
      ],
    });
  });

  it('shows loading state', () => {
    mockedFetchWorkEvidence.mockReturnValue(new Promise(() => undefined));

    renderWithRouter();

    expect(screen.getByLabelText('Loading work evidence...')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    mockedFetchWorkEvidence.mockResolvedValue({ items: [] });

    renderWithRouter();

    expect(await screen.findByText('No evidence logged')).toBeInTheDocument();
  });

  it('renders evidence data', async () => {
    mockedFetchWorkEvidence.mockResolvedValue({
      items: [
        {
          activityDate: '2025-03-02T00:00:00.000Z',
          effortHours: 4,
          id: 'we-1',
          personId: 'person-1',
          projectId: 'project-1',
          recordedAt: '2025-03-03T09:00:00.000Z',
          sourceRecordKey: 'WL-ATLAS-1',
          sourceType: 'JIRA_WORKLOG',
          summary: 'Implementation work on Atlas.',
        },
      ],
    });

    renderWithRouter();

    expect((await screen.findAllByText('Ethan Brooks')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Atlas ERP Rollout').length).toBeGreaterThan(0);
    expect(screen.getByText('JIRA_WORKLOG')).toBeInTheDocument();
    expect(screen.getByText('4h')).toBeInTheDocument();
  });

  it('shows API error state', async () => {
    mockedFetchWorkEvidence.mockRejectedValue(new Error('Work evidence unavailable'));

    renderWithRouter();

    expect(await screen.findByText('Work evidence unavailable')).toBeInTheDocument();
  });
});

function renderWithRouter(): void {
  render(
    <MemoryRouter initialEntries={['/work-evidence']}>
      <Routes>
        <Route element={<WorkEvidencePage />} path="/work-evidence" />
      </Routes>
    </MemoryRouter>,
  );
}
