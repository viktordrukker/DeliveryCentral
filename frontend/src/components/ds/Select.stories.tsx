import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Select } from './Select';

export default { title: 'DS / Select' };

const OPTIONS = ['Active', 'Pending', 'Closed', 'Cancelled'];

export const Default: Story = () => {
  const [value, setValue] = useState('Active');
  return (
    <Select value={value} onChange={(e) => setValue(e.target.value)}>
      {OPTIONS.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </Select>
  );
};

export const Invalid: Story = () => (
  <Select invalid defaultValue="">
    <option value="">Pick one…</option>
    {OPTIONS.map((option) => (
      <option key={option} value={option}>{option}</option>
    ))}
  </Select>
);

export const Disabled: Story = () => (
  <Select disabled defaultValue="Active">
    {OPTIONS.map((option) => (
      <option key={option} value={option}>{option}</option>
    ))}
  </Select>
);
