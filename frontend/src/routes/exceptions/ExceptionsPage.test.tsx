import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchExceptionById, fetchExceptions } from '@/lib/api/exceptions';
import { ExceptionsPage } from './ExceptionsPage';

vi.mock('@/lib/api/exceptions', () => ({
  fetchExceptionById: vi.fn(),
  fetchExceptions: vi.fn(),
}));

const mockedFetchExceptions = vi.mocked(fetchExceptions);
const mockedFetchExceptionById = vi.mocked(fetchExceptionById);

describe('ExceptionsPage', () => {
  beforeEach(() => {
    mockedFetchExceptions.mockReset();
    mockedFetchExceptionById.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('renders exception queue items from backend data', async () => {
    mockedFetchExceptions.mockResolvedValue(buildQueueResponse());
    mockedFetchExceptionById.mockResolvedValue(buildDetail());

    renderWithRouter('/exceptions');

    expect(await screen.findByRole('heading', { name: 'Exception Queue' })).toBeInTheDocument();
    expect(screen.getByText('Work Evidence Without Assignment')).toBeInTheDocument();
    expect(screen.getByText('Shadow work detected for Mia Lopez.')).toBeInTheDocument();
    expect(screen.getByText('Derived from assignments, work evidence, projects, and reconciliation records.')).toBeInTheDocument();
  });

  it('shows loading and empty states clearly', async () => {
    mockedFetchExceptions.mockReturnValueOnce(new Promise(() => undefined));

    renderWithRouter('/exceptions');

    expect(screen.getByText('Loading exceptions...')).toBeInTheDocument();
  });

  it('shows error state when the queue fails to load', async () => {
    mockedFetchExceptions.mockRejectedValue(new Error('Exception queue unavailable'));

    renderWithRouter('/exceptions');

    expect(await screen.findByText('Exception queue unavailable')).toBeInTheDocument();
  });

  it('renders detail review after selecting an exception item', async () => {
    mockedFetchExceptions.mockResolvedValue(buildQueueResponse());
    mockedFetchExceptionById.mockResolvedValue(buildDetail());

    const user = userEvent.setup();
    renderWithRouter('/exceptions');

    await screen.findByText('Shadow work detected for Mia Lopez.');
    await user.click(screen.getByText('Shadow work detected for Mia Lopez.'));

    await waitFor(() => {
      expect(mockedFetchExceptionById).toHaveBeenCalledWith('exc-1', {
        asOf: expect.any(String),
      });
    });

    expect(await screen.findAllByText('Shadow work detected for Mia Lopez.')).toHaveLength(2);
    expect(screen.getByText('Mia Lopez')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open person' })).toHaveAttribute('href', '/people/person-1');
    expect(screen.getByRole('link', { name: 'Open project' })).toHaveAttribute('href', '/projects/project-1');
    expect(screen.getByText(/Where the backend already supports governed override behavior/i)).toBeInTheDocument();
  });

  it('links project closure conflicts into project override controls', async () => {
    mockedFetchExceptions.mockResolvedValue({
      asOf: '2025-03-15T00:00:00.000Z',
      items: [
        {
          category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS' as const,
          id: 'exc-2',
          observedAt: '2026-04-04T10:00:00.000Z',
          projectId: 'project-99',
          projectName: 'Northstar Modernization',
          sourceContext: 'project' as const,
          status: 'OPEN' as const,
          summary: 'Project closure remains blocked because active assignments still exist.',
          targetEntityId: 'project-99',
          targetEntityType: 'project',
        },
      ],
      summary: {
        byCategory: {
          PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS: 1,
        },
        open: 1,
        total: 1,
      },
    });
    mockedFetchExceptionById.mockResolvedValue({
      category: 'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS' as const,
      id: 'exc-2',
      observedAt: '2026-04-04T10:00:00.000Z',
      projectId: 'project-99',
      projectName: 'Northstar Modernization',
      sourceContext: 'project' as const,
      status: 'OPEN' as const,
      summary: 'Project closure remains blocked because active assignments still exist.',
      targetEntityId: 'project-99',
      targetEntityType: 'project',
    });

    const { user } = renderWithRouter('/exceptions');

    await screen.findByText('Project closure remains blocked because active assignments still exist.');
    await user.click(
      screen.getByText('Project closure remains blocked because active assignments still exist.'),
    );

    expect(await screen.findByText('Project closure override available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review closure controls' })).toHaveAttribute(
      'href',
      '/projects/project-99',
    );
  });

  it('shows empty queue state when no exceptions match filters', async () => {
    mockedFetchExceptions.mockResolvedValue({
      asOf: '2025-03-15T00:00:00.000Z',
      items: [],
      summary: {
        byCategory: {},
        open: 0,
        total: 0,
      },
    });

    renderWithRouter('/exceptions');

    expect(await screen.findByText('No exceptions in view')).toBeInTheDocument();
  });
});

function buildQueueResponse() {
  return {
    asOf: '2025-03-15T00:00:00.000Z',
    items: [
      {
        category: 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT' as const,
        id: 'exc-1',
        observedAt: '2026-04-04T10:00:00.000Z',
        personDisplayName: 'Mia Lopez',
        personId: 'person-1',
        projectId: 'project-1',
        projectName: 'Atlas ERP Rollout',
        sourceContext: 'work_evidence' as const,
        status: 'OPEN' as const,
        summary: 'Shadow work detected for Mia Lopez.',
        targetEntityId: 'evidence-1',
        targetEntityType: 'work_evidence',
        workEvidenceId: 'evidence-1',
      },
    ],
    summary: {
      byCategory: {
        WORK_EVIDENCE_WITHOUT_ASSIGNMENT: 1,
      },
      open: 1,
      total: 1,
    },
  };
}

function buildDetail() {
  return {
    assignmentId: 'assignment-1',
    category: 'WORK_EVIDENCE_WITHOUT_ASSIGNMENT' as const,
    details: {
      observedHours: 6,
      sourceSystem: 'jira',
    },
    id: 'exc-1',
    observedAt: '2026-04-04T10:00:00.000Z',
    personDisplayName: 'Mia Lopez',
    personId: 'person-1',
    projectId: 'project-1',
    projectName: 'Atlas ERP Rollout',
    sourceContext: 'work_evidence' as const,
    status: 'OPEN' as const,
    summary: 'Shadow work detected for Mia Lopez.',
    targetEntityId: 'evidence-1',
    targetEntityType: 'work_evidence',
    workEvidenceId: 'evidence-1',
  };
}

function renderWithRouter(initialEntry: string) {
  return {
    user: userEvent.setup(),
    ...render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<ExceptionsPage />} path="/exceptions" />
      </Routes>
    </MemoryRouter>,
    ),
  };
}
