import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { renderRoute } from '@test/render-route';

vi.mock('@/lib/api/dashboard-delivery-manager', () => ({
  fetchDeliveryManagerDashboard: vi.fn().mockResolvedValue({
    asOf: '2025-03-15T00:00:00.000Z',
    burnRateTrend: [],
    dataSources: [],
    projectsMissingApprovedTime: [],
    openRequestsByProject: [],
    portfolioHealth: [],
    timeAlignment: {
      approvedTimeAfterAssignmentEndCount: 0,
      approvedTimeWithoutAssignmentCount: 0,
      matchedCount: 0,
      plannedWithoutApprovedTimeCount: 0,
    },
    staffingGaps: [],
    summary: {
      projectsMissingApprovedTimeCount: 0,
      projectsWithNoStaff: 0,
      projectsWithTimeVariance: 0,
      totalActiveAssignments: 5,
      totalActiveProjects: 3,
    },
  }),
  fetchScorecardHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/planned-vs-actual', () => ({
  fetchPlannedVsActual: vi.fn().mockResolvedValue({ anomalies: [], asOf: '', assignedButNoEvidence: [], evidenceButNoApprovedAssignment: [], matchedRecords: [] }),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 200, total: 0 }),
}));

vi.mock('@/lib/api/dashboard-pending-actions', () => ({
  fetchPendingActions: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
}));

vi.mock('@/lib/api/dm-team', () => ({
  fetchTeamConflicts: vi.fn().mockResolvedValue({
    asOf: '2026-06-10T00:00:00.000Z',
    conflicts: [],
  }),
}));

vi.mock('@/lib/feature-flags', async () => {
  const actual = await vi.importActual<typeof import('@/lib/feature-flags')>('@/lib/feature-flags');
  return {
    ...actual,
    isFeatureEnabled: vi.fn().mockReturnValue(false),
  };
});

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'dm-1', roles: ['delivery_manager'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('DeliveryManagerDashboardPage', () => {
  it('renders KPI strip and loading completes', async () => {
    const { DeliveryManagerDashboardPage } = await import('./DeliveryManagerDashboardPage');
    renderRoute(<DeliveryManagerDashboardPage />);

    expect(await screen.findByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows error state on API failure', async () => {
    const mod = await import('@/lib/api/dashboard-delivery-manager');
    vi.mocked(mod.fetchDeliveryManagerDashboard).mockRejectedValueOnce(new Error('Network error'));

    const { DeliveryManagerDashboardPage } = await import('./DeliveryManagerDashboardPage');
    renderRoute(<DeliveryManagerDashboardPage />);

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('renders team conflicts when dsRefresh is on and the API returns rows', async () => {
    // Re-arm the dashboard mock after the prior test's restoreAllMocks().
    const dashboardMod = await import('@/lib/api/dashboard-delivery-manager');
    vi.mocked(dashboardMod.fetchDeliveryManagerDashboard).mockResolvedValue({
      asOf: '2025-03-15T00:00:00.000Z',
      burnRateTrend: [],
      dataSources: [],
      projectsMissingApprovedTime: [],
      openRequestsByProject: [],
      portfolioHealth: [],
      timeAlignment: {
        approvedTimeAfterAssignmentEndCount: 0,
        approvedTimeWithoutAssignmentCount: 0,
        matchedCount: 0,
        plannedWithoutApprovedTimeCount: 0,
      },
      staffingGaps: [],
      summary: {
        projectsMissingApprovedTimeCount: 0,
        projectsWithNoStaff: 0,
        projectsWithTimeVariance: 0,
        totalActiveAssignments: 5,
        totalActiveProjects: 3,
      },
    });
    vi.mocked(dashboardMod.fetchScorecardHistory).mockResolvedValue([]);

    const pendingActionsMod = await import('@/lib/api/dashboard-pending-actions');
    vi.mocked(pendingActionsMod.fetchPendingActions).mockResolvedValue({
      items: [],
      totalCount: 0,
    });

    const featureFlags = await import('@/lib/feature-flags');
    vi.mocked(featureFlags.isFeatureEnabled).mockImplementation((id) => id === 'dsRefresh');

    const dmTeam = await import('@/lib/api/dm-team');
    vi.mocked(dmTeam.fetchTeamConflicts).mockResolvedValueOnce({
      asOf: '2026-06-10T00:00:00.000Z',
      conflicts: [
        {
          personId: 'person-1',
          personName: 'Alice Acker',
          weekStartIso: '2026-06-08T00:00:00.000Z',
          totalAllocationPct: 150,
          conflictPositions: [
            { positionId: 'pos-x', projectId: 'proj-a', projectCode: 'A', allocationPct: 100 },
            { positionId: 'pos-y', projectId: 'proj-b', projectCode: 'B', allocationPct: 50 },
          ],
        },
      ],
    });

    const { DeliveryManagerDashboardPage } = await import('./DeliveryManagerDashboardPage');
    renderRoute(<DeliveryManagerDashboardPage />);

    expect(await screen.findByText('Alice Acker')).toBeInTheDocument();
    expect(screen.getByText('150%')).toBeInTheDocument();
    // Drill-down link to one of the offending positions is present.
    const aLink = screen.getByText(/A \(100%\)/);
    expect(aLink.closest('a')).toHaveAttribute('href', '/project-positions/pos-x');

    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false);
  });
});
