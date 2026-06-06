import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderRoute } from '@test/render-route';
import { DirectorEscalationsCard } from './DirectorEscalationsCard';
import type { DmEscalation } from '@/lib/api/dm-escalation';

const listPending = vi.fn();
const confirmEscalation = vi.fn();
const overrideEscalation = vi.fn();

vi.mock('@/lib/api/dm-escalation', () => ({
  listPendingDmEscalations: () => listPending(),
  confirmDmEscalation: (id: string, notes?: string) => confirmEscalation(id, notes),
  overrideDmEscalation: (id: string, notes?: string) => overrideEscalation(id, notes),
}));

const sample: DmEscalation[] = [
  {
    id: 'e-1',
    publicId: null,
    sourceKind: 'milestone',
    sourceId: 's-1',
    reason: 'Sub-task moved without DM sign-off',
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

describe('DirectorEscalationsCard', () => {
  it('renders the empty state when no escalations are pending', async () => {
    listPending.mockResolvedValue([]);
    renderRoute(<DirectorEscalationsCard />);
    await waitFor(() => expect(screen.getByText('No escalations to triage')).toBeInTheDocument());
  });

  it('renders a row with confirm + override buttons for each pending escalation', async () => {
    listPending.mockResolvedValue(sample);
    renderRoute(<DirectorEscalationsCard />);
    await waitFor(() => expect(screen.getByTestId('director-escalations-table')).toBeInTheDocument());
    expect(screen.getByText('Carlos Vega')).toBeInTheDocument();
    expect(screen.getByText('Sub-task moved without DM sign-off')).toBeInTheDocument();
    expect(screen.getByTestId('director-escalation-confirm-e-1')).toBeInTheDocument();
    expect(screen.getByTestId('director-escalation-override-e-1')).toBeInTheDocument();
  });

  it('opens the confirm dialog and calls confirmDmEscalation on confirm', async () => {
    listPending.mockResolvedValue(sample);
    confirmEscalation.mockResolvedValue({ ...sample[0]!, status: 'CONFIRMED' });
    renderRoute(<DirectorEscalationsCard />);
    await waitFor(() => expect(screen.getByTestId('director-escalations-table')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('director-escalation-confirm-e-1'));
    await waitFor(() => expect(screen.getByText('Confirm DM rejection')).toBeInTheDocument());

    // Re-fetch on success
    listPending.mockResolvedValueOnce([]);

    // The modal footer button has data-autofocus and is the only one with
    // the literal text "Confirm" (the row-level trigger has the same label,
    // but pick the modal one via data-autofocus).
    const confirmButtons = screen.getAllByRole('button', { name: 'Confirm' });
    const modalConfirm = confirmButtons.find((b) => b.getAttribute('data-autofocus') === 'true')!;
    await user.click(modalConfirm);
    await waitFor(() => expect(confirmEscalation).toHaveBeenCalledWith('e-1', undefined));
  });

  it('opens the override dialog and calls overrideDmEscalation on confirm', async () => {
    listPending.mockResolvedValue(sample);
    overrideEscalation.mockResolvedValue({ ...sample[0]!, status: 'OVERRIDDEN' });
    renderRoute(<DirectorEscalationsCard />);
    await waitFor(() => expect(screen.getByTestId('director-escalations-table')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByTestId('director-escalation-override-e-1'));
    await waitFor(() => expect(screen.getByText('Override DM rejection')).toBeInTheDocument());

    listPending.mockResolvedValueOnce([]);

    const overrideButtons = screen.getAllByRole('button', { name: 'Override' });
    const modalOverride = overrideButtons.find((b) => b.getAttribute('data-autofocus') === 'true')!;
    await user.click(modalOverride);
    await waitFor(() => expect(overrideEscalation).toHaveBeenCalledWith('e-1', undefined));
  });

  it('renders an error state if the API rejects', async () => {
    listPending.mockRejectedValue(new Error('Boom'));
    renderRoute(<DirectorEscalationsCard />);
    await waitFor(() => expect(screen.getByText(/Boom/)).toBeInTheDocument());
  });
});
