/**
 * SoT PR 7 — DistributionStudio is the single canonical Planner surface
 * (DS canvas: JqlBar → 240px BenchSidebar + PlannerGrid + AnomalyDrawer).
 *
 * The standalone scenarios-only DistributionStudio + PlannerScenarioPanel
 * were retired in this PR. Scenario CRUD now lives inside the planner
 * toolbar (PlannerScenariosMenu) — tested separately.
 */
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { DistributionStudio } from './DistributionStudio';

const fetchWorkforcePlanner = vi.fn();

vi.mock('@/lib/api/staffing-desk', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/staffing-desk')>(
    '@/lib/api/staffing-desk',
  );
  return {
    ...actual,
    fetchWorkforcePlanner: (...args: unknown[]) => fetchWorkforcePlanner(...args),
  };
});

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'per-1', roles: ['admin'], displayName: 'Tester' },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('DistributionStudio (SoT PR 7 — single canonical Planner)', () => {
  it('renders the canonical Planner surface (Bench sidebar + grid)', async () => {
    fetchWorkforcePlanner.mockResolvedValue({
      weeks: [],
      projects: [],
      supply: { totalFte: 0, benchPeople: [], rollOffs: [] },
      demand: { totalHcRequired: 0, bySkill: [], draftProjectDemand: 0 },
      budget: { enabled: false, baselineMonthlyCost: 0, avgCostPerFte: 0 },
    });
    const { container } = renderRoute(<DistributionStudio />);
    await waitFor(() =>
      expect(container.querySelector('[data-testid="distribution-studio"]')).not.toBeNull(),
    );
    expect(fetchWorkforcePlanner).toHaveBeenCalled();
  });
});
