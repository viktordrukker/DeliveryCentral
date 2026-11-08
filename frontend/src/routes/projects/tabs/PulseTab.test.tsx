import { readFileSync } from 'node:fs';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { PulseTab } from './PulseTab';
import type { PulseSummaryDto } from '@/lib/api/project-pulse';
import type { ComputedRag } from '@/lib/api/project-rag';
import type { ProjectRiskDto } from '@/lib/api/project-risks';

const fetchProjectPulseSummary = vi.fn();
const fetchComputedRag = vi.fn();
const fetchRisks = vi.fn();
const fetchProjectById = vi.fn();
const fetchMilestones = vi.fn();
const fetchProjectBudgetDashboard = vi.fn();
const fetchPendingBudgetChangeRequests = vi.fn();
const listProjectPositions = vi.fn();

vi.mock('@/lib/api/project-pulse', () => ({
  fetchProjectPulseSummary: (id: string) => fetchProjectPulseSummary(id),
}));

vi.mock('@/lib/api/project-rag', () => ({
  fetchComputedRag: (id: string) => fetchComputedRag(id),
}));

vi.mock('@/lib/api/project-risks', () => ({
  fetchRisks: (id: string, query?: unknown) => fetchRisks(id, query),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectById: (id: string) => fetchProjectById(id),
}));

vi.mock('@/lib/api/project-milestones', () => ({
  fetchMilestones: (id: string) => fetchMilestones(id),
}));

vi.mock('@/lib/api/project-budget', () => ({
  fetchProjectBudgetDashboard: (id: string) => fetchProjectBudgetDashboard(id),
  fetchPendingBudgetChangeRequests: (id: string) => fetchPendingBudgetChangeRequests(id),
}));

vi.mock('@/lib/api/project-positions', () => ({
  listProjectPositions: (query: unknown) => listProjectPositions(query),
}));

// PulseTab reads principal.displayName for the All/Mine activity filter.
vi.mock('@/app/auth-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/auth-context')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      isLoading: false,
      principal: { personId: 'p1', displayName: 'Ada Lovelace', roles: [] },
    }),
  };
});

const sampleSummary: PulseSummaryDto = {
  projectId: 'p1',
  asOf: '2026-05-24T10:00:00Z',
  signals: [
    {
      key: 'cpi',
      label: 'CPI',
      value: 1.04,
      unit: null,
      explanation: 'Cost performance index — ≥1 means on/under budget.',
    },
    {
      key: 'avgMood',
      label: 'Team mood',
      value: 4.2,
      unit: null,
      explanation: 'Average pulse mood (1–5 scale).',
    },
    {
      key: 'openRisks',
      label: 'Open risks',
      value: 2,
      unit: null,
      explanation: 'Identified, unresolved risks.',
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

describe('PulseTab — DS canvas conformance (SoT PR 5)', () => {
  beforeEach(() => {
    fetchProjectById.mockResolvedValue({ externalLinks: [] });
    fetchMilestones.mockResolvedValue([]);
    fetchProjectBudgetDashboard.mockResolvedValue(null);
    fetchPendingBudgetChangeRequests.mockResolvedValue([]);
    listProjectPositions.mockResolvedValue({ positions: [], total: 0 });
  });

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
    expect(screen.getByText('CPI')).toBeInTheDocument();
    expect(screen.getByText('Team mood')).toBeInTheDocument();
    expect(screen.getByText('Open risks')).toBeInTheDocument();
    expect(container.querySelectorAll('.kpi').length).toBe(3);
    const tonedTiles = container.querySelectorAll('.kpi[class*="tone-"]');
    expect(tonedTiles.length).toBe(3);
  });

  it('maps real signal keys to correct tones (cpi≥1 + mood≥4 → active, openRisks<3 → info)', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    const { container } = renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-kpi-strip')).toBeInTheDocument());
    expect(container.querySelectorAll('.kpi.tone-active').length).toBe(2);
    expect(container.querySelectorAll('.kpi.tone-info').length).toBe(1);
  });

  it('renders the Next milestone section with donut + hit/total counts', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    fetchMilestones.mockResolvedValue([
      { id: 'm1', name: 'M1', status: 'HIT' },
      { id: 'm2', name: 'M2', status: 'HIT' },
      { id: 'm3', name: 'M3', status: 'IN_PROGRESS' },
      { id: 'm4', name: 'M4', status: 'MISSED' },
    ]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-milestones')).toBeInTheDocument());
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/\/ 4 milestones hit/)).toBeInTheDocument();
    expect(screen.getByText(/1 in progress · 1 missed/)).toBeInTheDocument();
  });

  it('shows the milestone empty state when no milestones are defined', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-milestones')).toBeInTheDocument());
    expect(
      screen.getByText('No milestones defined for this project yet.'),
    ).toBeInTheDocument();
  });

  it('renders the external link tiles section (4 fixed tiles per DS spec)', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    fetchProjectById.mockResolvedValue({
      externalLinks: [
        {
          provider: 'JIRA',
          externalProjectKey: 'COBOL',
          externalProjectName: 'COBOL Migration',
          externalUrl: 'https://jira.example/browse/COBOL',
          providerEnvironment: null,
          archived: false,
        },
      ],
    });
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-external-links')).toBeInTheDocument());
    // 4 fixed tiles per DS canvas
    expect(screen.getByText('Jira PPM')).toBeInTheDocument();
    expect(screen.getByText('Confluence')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Smartsheet')).toBeInTheDocument();
    expect(screen.getByText(/COBOL Migration · COBOL/)).toBeInTheDocument();
  });

  it('shows fallback text on tiles when no link exists for that provider', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-external-links')).toBeInTheDocument());
    expect(screen.getByText('No Jira project linked')).toBeInTheDocument();
    expect(screen.getByText('No Confluence space linked')).toBeInTheDocument();
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

  it('All/Mine toggle filters activity to the current user', async () => {
    const multiActor = {
      ...sampleSummary,
      activity: [
        { ...sampleSummary.activity[0], id: 'evt-mine', actorDisplayName: 'Ada Lovelace', summary: 'My own change.' },
        { ...sampleSummary.activity[0], id: 'evt-other', actorDisplayName: 'Grace Hopper', summary: 'Someone else change.' },
      ],
    };
    fetchProjectPulseSummary.mockResolvedValue(multiActor);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-activity')).toBeInTheDocument());
    expect(screen.getByText(/My own change/)).toBeInTheDocument();
    expect(screen.getByText(/Someone else change/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mine' }));
    await waitFor(() => expect(screen.queryByText(/Someone else change/)).not.toBeInTheDocument());
    expect(screen.getByText(/My own change/)).toBeInTheDocument();
  });

  it('footer Refresh re-fetches the pulse summary', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-refresh')).toBeInTheDocument());
    const before = fetchProjectPulseSummary.mock.calls.length;
    fireEvent.click(screen.getByTestId('pulse-refresh'));
    await waitFor(() =>
      expect(fetchProjectPulseSummary.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('shows the "Decision needed" banner when budget projection exceeds baseline > 5%', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    fetchProjectBudgetDashboard.mockResolvedValue({
      budget: { capex: 100_000, opex: 0, total: 100_000, fiscalYear: 2026 },
      forecast: { projectedTotalCost: 120_000, remainingBudget: -20_000, onTrack: false },
      burnDown: [],
      byRole: [],
      healthColor: 'red',
    });
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-decision-banner')).toBeInTheDocument());
    expect(screen.getByText(/Decision needed/)).toBeInTheDocument();
  });

  it('hides the decision banner when budget is within tolerance', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    fetchProjectBudgetDashboard.mockResolvedValue({
      budget: { capex: 100_000, opex: 0, total: 100_000, fiscalYear: 2026 },
      forecast: { projectedTotalCost: 100_000, remainingBudget: 0, onTrack: true },
      burnDown: [],
      byRole: [],
      healthColor: 'green',
    });
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-tab')).toBeInTheDocument());
    expect(screen.queryByTestId('pulse-decision-banner')).not.toBeInTheDocument();
  });

  it('renders the Decisions awaiting you card with empty state when none', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-decisions')).toBeInTheDocument());
    expect(screen.getByText('No decisions awaiting you on this project.')).toBeInTheDocument();
  });

  it('renders pending budget-change decisions in Decisions card', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    fetchPendingBudgetChangeRequests.mockResolvedValue([
      {
        id: 'bc1',
        publicId: null,
        projectBudgetId: 'b1',
        status: 'PENDING',
        requestedByPersonId: 'p2',
        requestedAt: '2026-05-20T00:00:00Z',
        requestedChange: { capexBudget: 50_000, opexBudget: 0 },
        decidedByPersonId: null,
        decisionAt: null,
        decisionReason: null,
      },
    ]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-decisions')).toBeInTheDocument());
    expect(screen.getByText('Approve budget change request')).toBeInTheDocument();
  });

  it('renders open positions table with role + status', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    listProjectPositions.mockResolvedValue({
      positions: [
        {
          id: 'pp1',
          projectId: 'p1',
          role: 'Lead Backend Engineer',
          requiredAllocationPercent: 100,
          fillStatus: 'OPEN',
          version: 1,
        },
      ],
      total: 1,
    });
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-positions')).toBeInTheDocument());
    expect(screen.getByText('Lead Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('shows empty state when there are no open positions', async () => {
    fetchProjectPulseSummary.mockResolvedValue(sampleSummary);
    fetchComputedRag.mockResolvedValue(null);
    fetchRisks.mockResolvedValue([]);
    renderRoute(<PulseTab projectId="p1" />);
    await waitFor(() => expect(screen.getByTestId('pulse-positions')).toBeInTheDocument());
    expect(screen.getByText('No open positions on this project.')).toBeInTheDocument();
  });
});

describe('PulseTab — DS canvas grep-verifiable acceptance (SoT §9.1)', () => {
  const src = readFileSync('src/routes/projects/tabs/PulseTab.tsx', 'utf-8');

  it('contains ZERO raw <h3> tags in PulseTab (all section titles use SectionCard)', () => {
    // Match any <h3 occurrence (open tag) — DS canvas requires SectionCard wrapping.
    expect(src).not.toMatch(/<h3[\s>]/);
  });

  it('contains all 8 DS canvas sections in order', () => {
    const banner = src.indexOf('pulse-decision-banner');
    const kpi = src.indexOf('pulse-kpi-strip');
    const rag = src.indexOf('pulse-rag-quadrant');
    const decisions = src.indexOf('pulse-decisions');
    const positions = src.indexOf('pulse-positions');
    const risks = src.indexOf('pulse-risks');
    const milestones = src.indexOf('pulse-milestones');
    const activity = src.indexOf('pulse-activity-wrap');
    const extLinks = src.indexOf('pulse-external-links');
    const freshness = src.indexOf('pulse-refresh');
    // Order: banner < kpi < rag < decisions < positions < risks < milestones < activity < extLinks < freshness
    expect(banner).toBeGreaterThan(-1);
    expect(banner).toBeLessThan(kpi);
    expect(kpi).toBeLessThan(rag);
    expect(rag).toBeLessThan(decisions);
    expect(decisions).toBeLessThan(positions);
    expect(positions).toBeLessThan(risks);
    expect(risks).toBeLessThan(milestones);
    expect(milestones).toBeLessThan(activity);
    expect(activity).toBeLessThan(extLinks);
    expect(extLinks).toBeLessThan(freshness);
  });
});
