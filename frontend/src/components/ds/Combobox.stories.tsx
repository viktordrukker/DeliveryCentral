import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Combobox, type ComboboxOption } from './Combobox';
import { FormField } from './FormField';

export default { title: 'DS / Forms / Combobox' };

const COUNTRIES: ComboboxOption[] = [
  { value: 'au', label: 'Australia', hint: 'AEST/AEDT' },
  { value: 'br', label: 'Brazil', hint: 'BRT' },
  { value: 'ca', label: 'Canada', hint: 'EST/PST' },
  { value: 'de', label: 'Germany', hint: 'CET' },
  { value: 'in', label: 'India', hint: 'IST' },
  { value: 'jp', label: 'Japan', hint: 'JST' },
  { value: 'mx', label: 'Mexico', hint: 'CST' },
  { value: 'nl', label: 'Netherlands', hint: 'CET' },
  { value: 'us', label: 'United States', hint: 'EST/PST' },
  { value: 'gb', label: 'United Kingdom', hint: 'GMT/BST' },
];

export const Basic: Story = () => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ width: 280 }}>
      <Combobox options={COUNTRIES} value={value} onValueChange={setValue} placeholder="Pick a country…" />
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
        Selected: <code>{value ?? 'null'}</code>
      </p>
    </div>
  );
};

export const InsideFormField: Story = () => {
  const [value, setValue] = useState<string | null>('us');
  return (
    <div style={{ width: 280 }}>
      <FormField label="Country" required>
        <Combobox options={COUNTRIES} value={value} onValueChange={setValue} />
      </FormField>
    </div>
  );
};

export const WithDisabledOption: Story = () => {
  const [value, setValue] = useState<string | null>(null);
  const opts = COUNTRIES.map((o) => (o.value === 'mx' ? { ...o, disabled: true, hint: 'Not available' } : o));
  return (
    <div style={{ width: 280 }}>
      <Combobox options={opts} value={value} onValueChange={setValue} />
    </div>
  );
};

export const Invalid: Story = () => {
  const [value, setValue] = useState<string | null>(null);
  return (
    <div style={{ width: 280 }}>
      <FormField label="Country" error="Required">
        <Combobox options={COUNTRIES} value={value} onValueChange={setValue} invalid />
      </FormField>
    </div>
  );
};
