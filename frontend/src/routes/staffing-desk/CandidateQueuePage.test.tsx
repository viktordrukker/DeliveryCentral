import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { CandidateQueuePage } from './CandidateQueuePage';
import type {
  UnifiedCandidateQueueResponse,
  UnifiedCandidateQueueRow,
} from '@/lib/api/staffing-candidates';

const fetchUnifiedCandidateQueue = vi.fn();

vi.mock('@/lib/api/staffing-candidates', () => ({
  fetchUnifiedCandidateQueue: (params: unknown) => fetchUnifiedCandidateQueue(params),
}));

function row(overrides: Partial<UnifiedCandidateQueueRow> = {}): UnifiedCandidateQueueRow {
  return {
    candidateId: 'cand-1',
    candidatePersonId: 'person-1',
    candidateName: 'Alice Adams',
    positionId: 'pos-1',
    positionPublicId: 'ppo_abc123',
    projectId: 'proj-1',
    projectName: 'Apollo',
    role: 'Senior Engineer',
    decision: 'PENDING',
    decidedAt: null,
    proposedAt: '2026-06-01T10:00:00.000Z',
    timeInQueueHours: 96,
    rank: 1,
    ...overrides,
  };
}

function response(rows: UnifiedCandidateQueueRow[]): UnifiedCandidateQueueResponse {
  return { rows, total: rows.length, page: 1, pageSize: 50 };
}

describe('CandidateQueuePage (LEAN-P4c-2)', () => {
  it('renders candidates returned by the API in oldest-first order', async () => {
    fetchUnifiedCandidateQueue.mockResolvedValue(
      response([
        row({ candidateId: 'cand-old', candidateName: 'Old Candidate', timeInQueueHours: 120 }),
        row({ candidateId: 'cand-new', candidateName: 'New Candidate', timeInQueueHours: 24 }),
      ]),
    );
    renderRoute(<CandidateQueuePage />);
    await waitFor(() =>
      expect(screen.getByTestId('candidate-queue-list')).toBeInTheDocument(),
    );
    expect(screen.getByText('Old Candidate')).toBeInTheDocument();
    expect(screen.getByText('New Candidate')).toBeInTheDocument();
  });

  it('shows the empty state with a forward action when the queue is empty', async () => {
    fetchUnifiedCandidateQueue.mockResolvedValue(response([]));
    renderRoute(<CandidateQueuePage />);
    await waitFor(() =>
      expect(screen.getByText(/No candidates in the queue/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: /Go to Staffing Desk/i })).toBeInTheDocument();
  });

  it('toggles sort order client-side (newest-first reverses the rows)', async () => {
    fetchUnifiedCandidateQueue.mockResolvedValue(
      response([
        row({ candidateId: 'cand-old', candidateName: 'Old Candidate' }),
        row({ candidateId: 'cand-new', candidateName: 'New Candidate' }),
      ]),
    );
    const user = userEvent.setup();
    renderRoute(<CandidateQueuePage />);
    await waitFor(() =>
      expect(screen.getByTestId('candidate-queue-list')).toBeInTheDocument(),
    );

    // Oldest-first: 'Old Candidate' is first in DOM order.
    const initialRows = screen.getAllByTestId(/^candidate-queue-row-/);
    expect(initialRows[0]).toHaveAttribute('data-testid', 'candidate-queue-row-cand-old');

    await user.click(screen.getByRole('button', { name: /Newest first/ }));

    await waitFor(() => {
      const reorderedRows = screen.getAllByTestId(/^candidate-queue-row-/);
      expect(reorderedRows[0]).toHaveAttribute('data-testid', 'candidate-queue-row-cand-new');
    });
  });

  it('passes page/pageSize to the API client', async () => {
    fetchUnifiedCandidateQueue.mockResolvedValue(response([]));
    renderRoute(<CandidateQueuePage />);
    await waitFor(() =>
      expect(fetchUnifiedCandidateQueue).toHaveBeenCalledWith({ page: 1, pageSize: 50 }),
    );
  });
});
