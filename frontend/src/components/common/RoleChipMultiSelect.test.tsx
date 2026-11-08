import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { ALL_ROLES, type AppRole } from '@/app/route-manifest';
import { RoleChipMultiSelect } from './RoleChipMultiSelect';

function Harness({ initial = [] as AppRole[] }: { initial?: AppRole[] }): JSX.Element {
  const [value, setValue] = useState<AppRole[]>(initial);
  return (
    <div>
      <RoleChipMultiSelect value={value} onChange={setValue} />
      <output data-testid="dump">{value.join('|')}</output>
    </div>
  );
}

describe('RoleChipMultiSelect (W2-15)', () => {
  it('renders chips for the initial value preserving order', () => {
    render(<Harness initial={['hr_manager', 'director']} />);
    expect(screen.getByText('HR Manager')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();
  });

  it('exposes all app roles in the dropdown', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox'));
    // Expect at least the management roles to be present as options.
    expect(screen.getByRole('option', { name: /HR Manager/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Director/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Admin/i })).toBeInTheDocument();
    // All roles, in fact, are sourced from ALL_ROLES — sanity-check that the
    // option count is the full role list (no extras, no missing).
    const visibleOptionCount = screen.getAllByRole('option').length;
    expect(visibleOptionCount).toBe(ALL_ROLES.length);
  });

  it('adds a chip when an option is selected, in selection order', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: /HR Manager/i }));
    // Popover stays open; pick a second one.
    await user.click(screen.getByRole('option', { name: /Director/i }));
    expect(screen.getByTestId('dump').textContent).toBe('hr_manager|director');
  });

  it('removes a chip via the chip remove button', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['hr_manager', 'director']} />);
    await user.click(screen.getByRole('button', { name: /Remove HR Manager/i }));
    expect(screen.getByTestId('dump').textContent).toBe('director');
  });

  it('restricts options to the allowedRoles subset when provided', async () => {
    const user = userEvent.setup();
    render(
      <RoleChipMultiSelect
        value={[]}
        onChange={() => undefined}
        allowedRoles={['hr_manager', 'director']}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: /HR Manager/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Director/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Admin$/i })).toBeNull();
  });
});
