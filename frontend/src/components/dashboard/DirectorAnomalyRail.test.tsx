import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { DirectorAnomalyRail } from './DirectorAnomalyRail';
import type { DirectorAnomalyDto } from '@/lib/api/dashboard-director';

const fetchDirectorAnomalies = vi.fn();

vi.mock('@/lib/api/dashboard-director', () => ({
  fetchDirectorAnomalies: (limit?: number) => fetchDirectorAnomalies(limit),
}));

const sampleItems: DirectorAnomalyDto[] = [
  {
    kind: 'budget_overrun',
    severity: 'danger',
    title: 'Project Apollo over budget',
    detail: '+18% vs plan (FY26)',
    href: '/projects/apollo?tab=budget',
    decayRate: 0.9,
    detectedAt: '2026-05-22T08:00:00Z',
    targetPositions: [],
  },
  {
    kind: 'milestone_slip',
    severity: 'warning',
    title: 'Atlas — phase 2 slipped',
    detail: 'Planned 2026-05-20, actual TBD',
    href: '/projects/atlas?tab=milestones',
    decayRate: 0.5,
    detectedAt: '2026-05-23T11:30:00Z',
    targetPositions: [],
  },
];

describe('DirectorAnomalyRail', () => {
  it('shows the loading state initially', () => {
    fetchDirectorAnomalies.mockImplementation(() => new Promise(() => {}));
    renderRoute(<DirectorAnomalyRail />);
    expect(screen.queryByTestId('director-anomaly-rail')).not.toBeInTheDocument();
  });

  it('renders the rail with one card per anomaly', async () => {
    fetchDirectorAnomalies.mockResolvedValue(sampleItems);
    renderRoute(<DirectorAnomalyRail />);
    await waitFor(() => expect(screen.getByTestId('director-anomaly-rail')).toBeInTheDocument());
    expect(screen.getByText('Project Apollo over budget')).toBeInTheDocument();
    expect(screen.getByText('Atlas — phase 2 slipped')).toBeInTheDocument();
  });

  it('shows a kind-specific deep-link button per card', async () => {
    fetchDirectorAnomalies.mockResolvedValue(sampleItems);
    renderRoute(<DirectorAnomalyRail />);
    await waitFor(() => expect(screen.getByTestId('director-anomaly-rail')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Open budget/ }).getAttribute('href')).toBe(
      '/projects/apollo?tab=budget',
    );
    expect(screen.getByRole('link', { name: /Open Gantt/ }).getAttribute('href')).toBe(
      '/projects/atlas?tab=milestones',
    );
  });

  it('shows kind labels (Budget · over, Milestone · slip, …)', async () => {
    fetchDirectorAnomalies.mockResolvedValue(sampleItems);
    renderRoute(<DirectorAnomalyRail />);
    await waitFor(() => expect(screen.getByText('Budget · over')).toBeInTheDocument());
    expect(screen.getByText('Milestone · slip')).toBeInTheDocument();
  });

  it('uses canvas tone-dots (one per row)', async () => {
    fetchDirectorAnomalies.mockResolvedValue(sampleItems);
    const { container } = renderRoute(<DirectorAnomalyRail />);
    await waitFor(() => expect(screen.getByTestId('director-anomaly-rail')).toBeInTheDocument());
    expect(container.querySelectorAll('.tone-dot').length).toBe(sampleItems.length);
  });

  it('renders a quiet-state card with "All clear" when there are no anomalies', async () => {
    fetchDirectorAnomalies.mockResolvedValue([]);
    renderRoute(<DirectorAnomalyRail />);
    await waitFor(() =>
      expect(screen.getByTestId('director-anomaly-rail-empty')).toBeInTheDocument(),
    );
    expect(screen.getByText('All clear')).toBeInTheDocument();
    expect(screen.getByText(/No anomalies detected/i)).toBeInTheDocument();
  });

  it('renders an error state when the endpoint fails', async () => {
    fetchDirectorAnomalies.mockRejectedValue(new Error('Boom'));
    renderRoute(<DirectorAnomalyRail />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });

  it('passes the limit through to the API client', async () => {
    fetchDirectorAnomalies.mockResolvedValue([]);
    renderRoute(<DirectorAnomalyRail limit={3} />);
    await waitFor(() => expect(fetchDirectorAnomalies).toHaveBeenCalledWith(3));
  });
});
