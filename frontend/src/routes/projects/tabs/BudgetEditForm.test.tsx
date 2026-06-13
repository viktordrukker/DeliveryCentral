import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { upsertProjectBudget } from '@/lib/api/project-budget';
import { BudgetEditForm } from './BudgetEditForm';

vi.mock('@/lib/api/project-budget', () => ({
  upsertProjectBudget: vi.fn(),
}));
const mockUpsert = vi.mocked(upsertProjectBudget);

describe('BudgetEditForm (EPIC A)', () => {
  beforeEach(() => mockUpsert.mockReset());

  it('saves via upsertProjectBudget and calls onSaved', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockUpsert.mockResolvedValue({ id: 'b1', projectId: 'p1', fiscalYear: 2026, capexBudget: 100_000, opexBudget: 50_000 });
    render(<BudgetEditForm projectId="p1" initial={null} onSaved={onSaved} onCancel={() => undefined} />);

    await user.click(screen.getByRole('button', { name: /Save budget/i }));
    await waitFor(() =>
      expect(mockUpsert).toHaveBeenCalledWith('p1', expect.objectContaining({ fiscalYear: expect.any(Number) })),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('sends vendorBudget + uppercased currencyCode when filled (EPIC G)', async () => {
    const user = userEvent.setup();
    mockUpsert.mockResolvedValue({ id: 'b1', projectId: 'p1', fiscalYear: 2026, capexBudget: 0, opexBudget: 0 });
    render(<BudgetEditForm projectId="p1" initial={null} onSaved={() => undefined} onCancel={() => undefined} />);

    await user.type(screen.getByPlaceholderText('optional'), '25000');
    await user.type(screen.getByPlaceholderText('e.g. USD'), 'usd');
    await user.click(screen.getByRole('button', { name: /Save budget/i }));

    await waitFor(() =>
      expect(mockUpsert).toHaveBeenCalledWith('p1', expect.objectContaining({ vendorBudget: 25_000, currencyCode: 'USD' })),
    );
  });

  it('omits vendorBudget + currencyCode when left blank (EPIC G)', async () => {
    const user = userEvent.setup();
    mockUpsert.mockResolvedValue({ id: 'b1', projectId: 'p1', fiscalYear: 2026, capexBudget: 0, opexBudget: 0 });
    render(<BudgetEditForm projectId="p1" initial={null} onSaved={() => undefined} onCancel={() => undefined} />);

    await user.click(screen.getByRole('button', { name: /Save budget/i }));

    await waitFor(() => expect(mockUpsert).toHaveBeenCalled());
    const arg = mockUpsert.mock.calls[0][1];
    expect(arg.vendorBudget).toBeUndefined();
    expect(arg.currencyCode).toBeUndefined();
  });

  it('prefills from the existing budget and titles "Edit budget"', () => {
    render(
      <BudgetEditForm
        projectId="p1"
        initial={{ fiscalYear: 2025, capex: 80_000, opex: 20_000 }}
        onSaved={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText('Edit budget')).toBeInTheDocument();
    expect(screen.getByDisplayValue('80000')).toBeInTheDocument();
  });

  it('Cancel calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<BudgetEditForm projectId="p1" initial={null} onSaved={() => undefined} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
