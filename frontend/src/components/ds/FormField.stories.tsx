import type { Story } from '@ladle/react';
import { useState } from 'react';

import { FormField } from './FormField';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Select } from './Select';

export default { title: 'DS / Forms / FormField' };

export const SimpleText: Story = () => {
  const [value, setValue] = useState('');
  return (
    <FormField label="Email" required hint="We'll never share this">
      {(props) => <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} {...props} />}
    </FormField>
  );
};

export const WithError: Story = () => (
  <FormField label="Phone" required error="Phone is required">
    {(props) => <Input type="tel" {...props} />}
  </FormField>
);

export const Textarea_Field: Story = () => (
  <FormField label="Bio" hint="Up to 200 characters">
    {(props) => <Textarea rows={3} {...props} />}
  </FormField>
);

export const Select_Field: Story = () => {
  const [value, setValue] = useState('active');
  return (
    <FormField label="Status">
      {(props) => (
        <Select value={value} onChange={(e) => setValue(e.target.value)} {...props}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </Select>
      )}
    </FormField>
  );
};
