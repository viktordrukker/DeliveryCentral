import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { DmEscalationsCard } from './DmEscalationsCard';
import type { DmEscalation } from '@/lib/api/dm-escalation';

const listMine = vi.fn();

vi.mock('@/lib/api/dm-escalation', () => ({
  listMyDmEscalations: () => listMine(),
}));

const sample: DmEscalation[] = [
  {
    id: 'e-1',
    publicId: null,
    sourceKind: 'timesheet',
    sourceId: 's-1',
    reason: 'Hours not backed by evidence',
    status: 'PENDING',
    escalatedByPersonId: 'dm-1',
    escalatedByDisplayName: 'Carlos Vega',
    escalatedToPersonId: null,
    escalatedToDisplayName: null,
    resolvedAt: null,
    resolvedByPersonId: null,
    resolvedByDisplayName: null,
    resolutionNotes: null,
    createdAt: '2026-06-06T10:00:00.000Z',
    updatedAt: '2026-06-06T10:00:00.000Z',
  },
];

describe('DmEscalationsCard', () => {
  it('renders the empty state when there are no escalations', async () => {
    listMine.mockResolvedValue([]);
    renderRoute(<DmEscalationsCard />);
    await waitFor(() => expect(screen.getByText('No escalations open')).toBeInTheDocument());
  });

  it('renders one row per escalation', async () => {
    listMine.mockResolvedValue(sample);
    renderRoute(<DmEscalationsCard />);
    await waitFor(() => expect(screen.getByTestId('dm-escalations-mine-table')).toBeInTheDocument());
    expect(screen.getByText('Hours not backed by evidence')).toBeInTheDocument();
    expect(screen.getByText('Timesheet')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows the error state when the endpoint fails', async () => {
    listMine.mockRejectedValue(new Error('Boom'));
    renderRoute(<DmEscalationsCard />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });
});
