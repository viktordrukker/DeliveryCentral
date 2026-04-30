import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Input } from './Input';

export default { title: 'DS / Input' };

export const Default: Story = () => {
  const [value, setValue] = useState('');
  return <Input placeholder="Search projects" value={value} onChange={(e) => setValue(e.target.value)} />;
};

export const Invalid: Story = () => <Input value="bad@" invalid placeholder="Email" />;

export const Disabled: Story = () => <Input value="readonly" disabled />;

export const Types: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Input type="text" placeholder="text" />
    <Input type="email" placeholder="email" />
    <Input type="number" placeholder="number" />
    <Input type="date" />
  </div>
);
