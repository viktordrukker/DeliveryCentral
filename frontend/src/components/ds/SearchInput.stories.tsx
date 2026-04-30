import type { Story } from '@ladle/react';
import { useState } from 'react';

import { SearchInput } from './SearchInput';

export default { title: 'DS / Forms / SearchInput' };

export const Default: Story = () => {
  const [q, setQ] = useState('');
  return (
    <div style={{ width: 320 }}>
      <SearchInput value={q} onValueChange={setQ} placeholder="Search projects…" />
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>Current: {q ? `"${q}"` : '(empty)'}</p>
    </div>
  );
};

export const Disabled: Story = () => (
  <div style={{ width: 320 }}>
    <SearchInput value="frozen" onValueChange={() => undefined} disabled />
  </div>
);
