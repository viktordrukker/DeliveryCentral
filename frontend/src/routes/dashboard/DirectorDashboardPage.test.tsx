import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { fetchDirectorDashboard, fetchDirectorOrgHealth } from '@/lib/api/dashboard-director';
import { fetchDirectorSlaSummary } from '@/lib/api/dashboard-exec-sla';
import {
  fetchAvailablePool,
  fetchPortfolioFinance,
  fetchPortfolioSummary,
} from '@/lib/api/portfolio-dashboard';
import { fetchProjectDirectory } from '@/lib/api/project-registry';
import { fetchProjectHealthBatch } from '@/lib/api/project-health';
import { fetchBusinessAudit } from '@/lib/api/business-audit';
import { renderRoute } from '@test/render-route';
import { DirectorDashboardPage } from './DirectorDashboardPage';

vi.mock('@/lib/api/dashboard-director', () => ({
  fetchDirectorDashboard: vi.fn(),
  fetchDirectorOrgHealth: vi.fn(),
  fetchDirectorAnomalies: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/portfolio-dashboard', () => ({
  fetchPortfolioSummary: vi.fn(),
  fetchAvailablePool: vi.fn(),
  fetchPortfolioFinance: vi.fn(),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn(),
}));

vi.mock('@/lib/api/project-health', () => ({
  fetchProjectHealthBatch: vi.fn(),
}));

vi.mock('@/lib/api/dashboard-exec-sla', () => ({
  fetchDirectorSlaSummary: vi.fn(),
}));

vi.mock('@/lib/api/business-audit', () => ({
  fetchBusinessAudit: vi.fn().mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 }),
}));

const mockedFetchDirectorDashboard = vi.mocked(fetchDirectorDashboard);
const mockedFetchDirectorOrgHealth = vi.mocked(fetchDirectorOrgHealth);
const mockedFetchDirectorSlaSummary = vi.mocked(fetchDirectorSlaSummary);
const mockedFetchPortfolioSummary = vi.mocked(fetchPortfolioSummary);
const mockedFetchPortfolioFinance = vi.mocked(fetchPortfolioFinance);
const mockedFetchAvailablePool = vi.mocked(fetchAvailablePool);
const mockedFetchProjectDirectory = vi.mocked(fetchProjectDirectory);
const mockedFetchProjectHealthBatch = vi.mocked(fetchProjectHealthBatch);
const mockedFetchBusinessAudit = vi.mocked(fetchBusinessAudit);

const DASHBOARD_DATA = {
  asOf: '2026-04-05T00:00:00.000Z',
  dataSources: ['assignments', 'projects'],
  summary: {
    activeAssignmentCount: 45,
    activeProjectCount: 12,
    staffedPersonCount: 30,
    staffingUtilisationRate: 90,
    unstaffedActivePersonCount: 3,
  },
  unitUtilisation: [
    {
      memberCount: 10,
      orgUnitId: 'unit-1',
      orgUnitName: 'Engineering',
      staffedCount: 8,
      utilisation: 80,
    },
  ],
  weeklyTrend: [
    { activeProjectCount: 12, staffingUtilisationRate: 90, staffedPersonCount: 30, weekStarting: '2026-03-30' },
  ],
};

describe('DirectorDashboardPage', () => {
  beforeEach(() => {
    mockedFetchDirectorDashboard.mockReset();
    mockedFetchPortfolioSummary.mockResolvedValue({
      totalProjects: 12,
      byRag: { green: 7, amber: 3, red: 2 },
      totalInternalHC: 0,
      totalVendorHC: 0,
      totalOpenGaps: 5,
      overallFillRate: 85,
      benchSize: 3,
    });
    mockedFetchPortfolioFinance.mockResolvedValue({
      fiscalYear: 2026,
      projectCount: 12,
      totalBudget: 8_400_000,
      totalActualCost: 5_620_000,
      totalEarnedValue: 5_410_000,
      cpi: 0.96,
      overBudgetProjectCount: 2,
    });
    mockedFetchAvailablePool.mockResolvedValue([]);
    mockedFetchProjectDirectory.mockResolvedValue({ items: [] });
    mockedFetchProjectHealthBatch.mockResolvedValue(new Map());
    mockedFetchDirectorSlaSummary.mockResolvedValue({
      slaBreaches24h: 0,
      timeToFillSeries: [0, 0, 0, 0],
      timeToFillMedianDays: null,
      timeToFillSampleSize: 0,
    });
    mockedFetchDirectorOrgHealth.mockResolvedValue({
      asOf: '2026-04-05T00:00:00.000Z',
      totalHeadcount: 0,
      totalBenchSize: 0,
      portfolioUnfillRatePct: 0,
      units: [],
    });
    mockedFetchBusinessAudit.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 20 });
  });

  it('renders the DS-canvas PageHeader and 5-tile KPI strip', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    expect(await screen.findByText('Portfolio · this week')).toBeInTheDocument();

    expect(await screen.findByText('Active projects')).toBeInTheDocument();
    expect(screen.getByText('At-risk projects')).toBeInTheDocument();
    expect(screen.getByText('Budget variance · portfolio')).toBeInTheDocument();
    expect(screen.getByText('Utilisation')).toBeInTheDocument();
    expect(screen.getByText('Open positions')).toBeInTheDocument();
  });

  it('renders the "What needs you now" anomaly strip wrapper', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    expect(await screen.findByTestId('director-what-needs-you-now')).toBeInTheDocument();
  });

  it('renders the 4-axis RAG portfolio table section', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    expect(await screen.findByText('Portfolio · 4-axis RAG')).toBeInTheDocument();
  });

  it('renders the 3-col grid: Headcount mix + Cash position + Recent decisions', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    expect(await screen.findByText('Headcount mix')).toBeInTheDocument();
    expect(await screen.findByText('Cash position')).toBeInTheDocument();
    expect(await screen.findByText('Recent decisions')).toBeInTheDocument();
  });

  it('renders the hero 2-col: burn chart + variance by driver', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    expect(await screen.findByTestId('director-burn-chart')).toBeInTheDocument();
    expect(await screen.findByTestId('director-variance-by-driver')).toBeInTheDocument();
  });

  it('renders the freshness footer', async () => {
    mockedFetchDirectorDashboard.mockResolvedValue(DASHBOARD_DATA);

    renderWithRouter();

    expect(await screen.findByTestId('director-data-freshness')).toBeInTheDocument();
  });

  it('shows error state when dashboard fetch fails', async () => {
    mockedFetchDirectorDashboard.mockRejectedValue(new Error('Server error'));

    renderWithRouter();

    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });
});

function renderWithRouter(path = '/dashboard/director') {
  return renderRoute(
    <Routes>
      <Route element={<DirectorDashboardPage />} path="/dashboard/director" />
    </Routes>,
    { initialEntries: [path] },
  );
}
