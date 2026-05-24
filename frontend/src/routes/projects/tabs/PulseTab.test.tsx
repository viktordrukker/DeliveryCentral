import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { PulseTab } from './PulseTab';
import type { PulseSummaryDto } from '@/lib/api/project-pulse';

const fetchProjectPulseSummary = vi.fn();

vi.mock('@/lib/api/project-pulse', () => ({
  fetchProjectPulseSummary: (id: string) => fetchProjectPulseSummary(id),
}));

const sampleSummary: PulseSummaryDto = {
  projectId: 'p1',
  asOf: '2026-05-24T10:00:00Z',
  signals: [
    {
      key: 'open_positions',
      label: 'Open positions',
      value: 3,
      unit: null,
      explanation: 'Positions not yet filled on this project.',
    },
    {
      key: 'budget_variance_pct',
      label: 'Budget variance',
      value: -2.1,
      unit: '%',
      explanation: 'Approved spend vs plan.',
    },
    {
      key: 'milestone_progress',
      label: 'Milestone progress',
      value: 64,
      unit: '%',
      explanation: 'Completed milestones over total.',
    },
  ],
  activity: [
    {
      id: 'evt1',
      occurredAt: '2026-05-23T09:00:00Z',
      eventName: 'MilestoneCompleted',
      aggregateType: 'project',
      aggregateId: 'p1',
      actorDisplayName: 'Ada Lovelace',
      summary: 'Phase 2 milestone completed.',
    },
  ],
};

describe('PulseTab', () => {
  it('shows a loading state while fetching', () => {
    fetchProjectPulseSummary.mockImplementation(() => new Promise(() => {}));
    renderRoute(<PulseTab projectId="p1" />);
    expect(screen.queryByTestId('pulse-tab')).not.toBeInTheDocument();
  });

  it('renders KPI strip + activity timeline on success', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-tab')).toBeInTheDocument());
    expect(screen.getByTestId('pulse-kpi-strip')).toBeInTheDocument();
    expect(screen.getByText('Open positions')).toBeInTheDocument();
    expect(screen.getByText('Budget variance')).toBeInTheDocument();
    expect(screen.getByText('Phase 2 milestone completed.')).toBeInTheDocument();
  });

  it('formats values per unit', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText('-2.1%')).toBeInTheDocument());
    expect(screen.getByText('64.0%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders an empty-activity message when activity[] is empty', async () => {
    fetchProjectPulseSummary.mockResolvedValue({ ...sampleSummary, activity: [] });
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() =>
      expect(screen.getByText('No recent activity recorded for this project.')).toBeInTheDocument(),
    );
  });

  it('shows an error state when the aggregator fails', async () => {
    fetchProjectPulseSummary.mockRejectedValue(new Error('Boom'));
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });

  it('shows data freshness timestamp', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText(/Data freshness:/)).toBeInTheDocument());
  });
});
