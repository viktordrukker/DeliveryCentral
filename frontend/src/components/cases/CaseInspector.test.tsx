import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { CaseRecord } from '@/lib/api/cases';
import { CaseInspector } from './CaseInspector';

const baseRow: CaseRecord = {
  caseNumber: 'CASE-1001',
  caseTypeDisplayName: 'Onboarding',
  caseTypeKey: 'ONBOARDING',
  id: 'case-1',
  openedAt: '2026-04-04T09:00:00.000Z',
  ownerPersonId: 'owner-1',
  ownerPersonName: 'Lucas Reed',
  participants: [{ personId: 'p-1', role: 'APPROVER' }],
  status: 'OPEN',
  subjectPersonId: 'subject-1',
  subjectPersonName: 'Ethan Brooks',
  summary: 'New starter needs project access review.',
};

function renderInspector(
  overrides: Partial<CaseRecord> = {},
  opts: { onClose?: () => void; position?: Parameters<typeof CaseInspector>[0]['position'] } = {},
): { onClose: () => void } {
  const onClose = opts.onClose ?? vi.fn();
  render(
    <MemoryRouter>
      <CaseInspector row={{ ...baseRow, ...overrides }} onClose={onClose} position={opts.position} />
    </MemoryRouter>,
  );
  return { onClose };
}

describe('CaseInspector', () => {
  it('renders case-number header and case-type subtitle', () => {
    renderInspector();
    expect(screen.getByText('CASE-1001')).toBeInTheDocument();
    expect(screen.getByText(/Onboarding/)).toBeInTheDocument();
  });

  it('renders status badge, subject, owner and participants count', () => {
    renderInspector();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('Ethan Brooks')).toBeInTheDocument();
    expect(screen.getByText('Lucas Reed')).toBeInTheDocument();
    // participants.length + 2 (subject + owner)
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('falls back to ids when person names are absent', () => {
    renderInspector({ subjectPersonName: undefined, ownerPersonName: undefined });
    expect(screen.getByText('subject-1')).toBeInTheDocument();
    expect(screen.getByText('owner-1')).toBeInTheDocument();
  });

  it('renders an Open case link to /cases/:id', () => {
    renderInspector();
    const link = screen.getByRole('link', { name: /open case/i });
    expect(link).toHaveAttribute('href', '/cases/case-1');
  });

  it('renders the cancel reason section when present', () => {
    renderInspector({ status: 'CANCELLED', cancelReason: 'duplicate ticket' });
    expect(screen.getByTestId('case-inspector-cancel-reason')).toBeInTheDocument();
    expect(screen.getByText('duplicate ticket')).toBeInTheDocument();
  });

  it('omits the cancel reason section when not cancelled', () => {
    renderInspector();
    expect(screen.queryByTestId('case-inspector-cancel-reason')).not.toBeInTheDocument();
  });

  it('invokes onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderInspector({}, { onClose });
    await user.click(screen.getByRole('button', { name: /close inspector/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a position stepper that fires onPrev/onNext', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    renderInspector({}, { position: { index: 1, total: 5, onPrev, onNext } });
    expect(screen.getByTestId('case-inspector-stepper')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /previous case/i }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /next case/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables prev when at the first row and next when at the last row', () => {
    renderInspector({}, { position: { index: 0, total: 3 } });
    expect(screen.getByRole('button', { name: /previous case/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next case/i })).toBeDisabled();
  });
});
