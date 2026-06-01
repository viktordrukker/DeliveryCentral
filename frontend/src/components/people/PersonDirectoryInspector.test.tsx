import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { PersonDirectoryItem } from '@/lib/api/person-directory';
import { PersonDirectoryInspector } from './PersonDirectoryInspector';

const baseRow: PersonDirectoryItem = {
  currentAssignmentCount: 3,
  currentLineManager: { displayName: 'Sophia Kim', id: 'm1' },
  currentOrgUnit: { code: 'ENG', id: 'org-eng', name: 'Engineering' },
  displayName: 'Ada Lovelace',
  dottedLineManagers: [],
  grade: 'L5',
  hiredAt: null,
  id: 'p-1',
  lifecycleStatus: 'ACTIVE',
  primaryEmail: 'ada@example.com',
  resourcePoolIds: [],
  resourcePools: [],
  role: 'Engineer',
  terminatedAt: null,
};

function renderInspector(
  overrides: Partial<PersonDirectoryItem> = {},
  opts: { onClose?: () => void; position?: Parameters<typeof PersonDirectoryInspector>[0]['position'] } = {},
): { onClose: () => void } {
  const onClose = opts.onClose ?? vi.fn();
  render(
    <MemoryRouter>
      <PersonDirectoryInspector row={{ ...baseRow, ...overrides }} onClose={onClose} position={opts.position} />
    </MemoryRouter>,
  );
  return { onClose };
}

describe('PersonDirectoryInspector', () => {
  it('renders identity header and subtitle from role/grade/org', () => {
    renderInspector();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Engineer · L5 · Engineering/)).toBeInTheDocument();
  });

  it('renders status badge, active assignments, line manager and email', () => {
    renderInspector();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Sophia Kim')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('renders an Open profile link to /people/:id', () => {
    renderInspector();
    const link = screen.getByRole('link', { name: /open profile/i });
    expect(link).toHaveAttribute('href', '/people/p-1');
  });

  it('lists dotted-line managers when present', () => {
    renderInspector({
      dottedLineManagers: [
        { displayName: 'Lucas Reed', id: 'm2' },
        { displayName: 'Diana Walsh', id: 'm3' },
      ],
    });
    expect(screen.getByTestId('person-directory-inspector-dotted')).toBeInTheDocument();
    expect(screen.getByText('Lucas Reed')).toBeInTheDocument();
    expect(screen.getByText('Diana Walsh')).toBeInTheDocument();
  });

  it('omits the dotted-line section when there are no dotted-line managers', () => {
    renderInspector();
    expect(screen.queryByTestId('person-directory-inspector-dotted')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('person-directory-inspector-stepper')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /previous person/i }));
    expect(onPrev).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /next person/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('disables prev when at the first row and next when at the last row', () => {
    renderInspector({}, { position: { index: 0, total: 3 } });
    expect(screen.getByRole('button', { name: /previous person/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next person/i })).toBeDisabled();
  });
});
