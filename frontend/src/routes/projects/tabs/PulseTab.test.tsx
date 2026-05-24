import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { PulseTab } from './PulseTab';
import type { PulseSummaryDto } from '@/lib/api/project-pulse';
import type { ComputedRag } from '@/lib/api/project-rag';
import type { ProjectRiskDto } from '@/lib/api/project-risks';

const fetchProjectPulseSummary = vi.fn();
const fetchComputedRag = vi.fn();
const fetchRisks = vi.fn();

vi.mock('@/lib/api/project-pulse', () => ({
  fetchProjectPulseSummary: (id: string) => fetchProjectPulseSummary(id),
}));

vi.mock('@/lib/api/project-rag', () => ({
  fetchComputedRag: (id: string) => fetchComputedRag(id),
}));

vi.mock('@/lib/api/project-risks', () => ({
  fetchRisks: (id: string, query?: unknown) => fetchRisks(id, query),
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

const sampleRag: ComputedRag = {
  scheduleRag: 'AMBER',
  scheduleExplanation: 'Schedule slipping vs plan.',
  budgetRag: 'RED',
  budgetExplanation: '−8% vs plan.',
  staffingRag: 'GREEN',
  staffingExplanation: 'All positions filled.',
  overallRag: 'AMBER',
};

const sampleRisks: ProjectRiskDto[] = [
  {
    id: 'r1',
    projectId: 'p1',
    title: 'COBOL specialist pipeline empty',
    description: null,
    category: 'TECHNICAL',
    riskType: 'RISK',
    probability: 4,
    impact: 5,
    riskScore: 20,
    strategy: null,
    strategyDescription: null,
    damageControlPlan: null,
    status: 'IDENTIFIED',
    ownerPersonId: null,
    ownerDisplayName: 'RM Team',
    assigneePersonId: null,
    assigneeDisplayName: null,
    raisedAt: '2026-05-15T00:00:00Z',
    dueDate: null,
    resolvedAt: null,
    convertedFromRiskId: null,
    relatedCaseId: null,
  },
];

describe('PulseTab — D1 fidelity', () => {
  it('shows a loading state while fetching', () => {
    fetchProjectPulseSummary.mockImplementation(() => new Promise(() => {}));
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    expect(screen.queryByTestId('pulse-tab')).not.toBeInTheDocument();
  });

  it('renders the KPI strip from signals with tone-aware tile classes', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    const { container } = renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-kpi-strip')).toBeInTheDocument());
    expect(screen.getByText('Open positions')).toBeInTheDocument();
    expect(screen.getByText('Budget variance')).toBeInTheDocument();
    expect(screen.getByText('Milestone progress')).toBeInTheDocument();
    // tone classes applied per-tile (3 signals → 3 tiles, all have a tone)
    expect(container.querySelectorAll('.kpi').length).toBe(3);
    const tonedTiles = container.querySelectorAll('.kpi[class*="tone-"]');
    expect(tonedTiles.length).toBe(3);
  });

  it('renders the 4-quadrant RAG grid when /rag-computed succeeds', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(sampleRag);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-rag-quadrant')).toBeInTheDocument());
    expect(screen.getByText('Delivery')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Overall')).toBeInTheDocument();
  });

  it('hides the RAG quadrant gracefully when /rag-computed fails', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockRejectedValue(new Error('rag unavailable'));
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-tab')).toBeInTheDocument());
    expect(screen.queryByTestId('pulse-rag-quadrant')).not.toBeInTheDocument();
  });

  it('renders the top-risks card with bucket badge', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue(sampleRisks);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() =>
      expect(screen.getByText('COBOL specialist pipeline empty')).toBeInTheDocument(),
    );
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText(/Score 20/)).toBeInTheDocument();
  });

  it('renders the activity timeline', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-activity')).toBeInTheDocument());
    expect(screen.getByText(/Phase 2 milestone completed/)).toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
  });

  it('renders an empty-activity message when activity[] is empty', async () => {
    fetchProjectPulseSummary.mockResolvedValue({ ...sampleSummary, activity: [] });
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() =>
      expect(
        screen.getByText('No recent activity recorded for this project.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows error state when the aggregator fails', async () => {
    fetchProjectPulseSummary.mockRejectedValue(new Error('Boom'));
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });

  it('shows data freshness footer', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByText(/Data as of/)).toBeInTheDocument());
  });
});
