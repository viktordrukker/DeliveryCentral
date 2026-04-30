import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Radio } from './Radio';

export default { title: 'DS / Radio' };

export const Group: Story = () => {
  const [value, setValue] = useState('day');
  return (
    <div role="radiogroup" aria-label="Theme" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {(['day', 'night', 'system'] as const).map((option) => (
        <Radio
          key={option}
          name="theme"
          value={option}
          label={option}
          checked={value === option}
          onChange={(e) => setValue(e.target.value)}
        />
      ))}
    </div>
  );
};

export const Disabled: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Radio name="x" disabled label="Disabled, off" />
    <Radio name="x" disabled defaultChecked label="Disabled, on" />
  </div>
);
