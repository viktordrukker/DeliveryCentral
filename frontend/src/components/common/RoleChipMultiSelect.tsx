import { useMemo } from 'react';

import { MultiCombobox, type ComboboxOption } from '@/components/ds';
import { ALL_ROLES, type AppRole } from '@/app/route-manifest';

/**
 * Multi-select chip input for app roles. Sourced from {@link ALL_ROLES} so
 * approval-chain configuration cannot reference roles the platform doesn't
 * recognize. Order is preserved (chains imply step order).
 */

const ROLE_LABELS: Record<AppRole, string> = {
  employee: 'Employee',
  hr_manager: 'HR Manager',
  project_manager: 'Project Manager',
  resource_manager: 'Resource Manager',
  delivery_manager: 'Delivery Manager',
  director: 'Director',
  admin: 'Admin',
};

interface RoleChipMultiSelectProps {
  value: AppRole[];
  onChange: (next: AppRole[]) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Optional subset of roles to expose. Defaults to {@link ALL_ROLES}. */
  allowedRoles?: AppRole[];
}

export function RoleChipMultiSelect({
  value,
  onChange,
  placeholder = 'Add a role…',
  disabled,
  invalid,
  allowedRoles,
}: RoleChipMultiSelectProps): JSX.Element {
  const options: ComboboxOption<AppRole>[] = useMemo(() => {
    const roles = allowedRoles ?? ALL_ROLES;
    return roles.map((r) => ({
      value: r,
      label: ROLE_LABELS[r],
      hint: r,
    }));
  }, [allowedRoles]);

  return (
    <MultiCombobox<AppRole>
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      invalid={invalid}
      emptyLabel="No more roles available"
    />
  );
}
