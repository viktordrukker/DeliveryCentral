import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Checkbox } from './Checkbox';

export default { title: 'DS / Checkbox' };

export const Unchecked: Story = () => <Checkbox label="Receive email digest" />;

export const Checked: Story = () => <Checkbox defaultChecked label="Receive email digest" />;

export const Disabled: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Checkbox disabled label="Disabled, off" />
    <Checkbox disabled defaultChecked label="Disabled, on" />
  </div>
);

export const Controlled: Story = () => {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label={`I agree (currently ${checked ? 'yes' : 'no'})`}
      checked={checked}
      onChange={(e) => setChecked(e.target.checked)}
    />
  );
};
