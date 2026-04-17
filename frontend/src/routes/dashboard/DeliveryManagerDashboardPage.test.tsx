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
});
